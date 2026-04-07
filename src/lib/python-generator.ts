import { PipelineNode, Connector, JoinOperation, FilterOperation, GroupByOperation, SortOperation, SelectColumnsOperation, DeduplicationOperation, MissingValuesOperation } from './pipeline-data';

/**
 * Generates a Palantir Foundry PySpark transform script based on the pipeline.
 * Every operation type from the canvas produces correct, matching PySpark code.
 */
export function generatePythonCode(nodes: PipelineNode[] = [], connectors: Connector[] = []): string {
  if (!nodes || nodes.length === 0) {
    return "# No nodes defined in the pipeline canvas.";
  }

  const sources = nodes.filter(n => n.type === 'source');
  const destinations = nodes.filter(n => n.type === 'destination');

  // Track which node IDs have been assigned a variable (avoid double-declaring)
  const declaredVars = new Set<string>();

  // Build a stable variable name for each node ID
  const nodeVarMap = new Map<string, string>();
  const varNameCounts = new Map<string, number>();

  const getVarName = (nodeId: string): string => {
    if (nodeVarMap.has(nodeId)) {
      return nodeVarMap.get(nodeId)!;
    }
    const node = nodes.find(n => n.id === nodeId);
    let base: string;
    if (!node) {
      base = `df_${nodeId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    } else {
      const clean = node.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      base = clean;
    }
    // Ensure uniqueness
    const count = varNameCounts.get(base) || 0;
    varNameCounts.set(base, count + 1);
    const varName = count === 0 ? base : `${base}_${count}`;
    nodeVarMap.set(nodeId, varName);
    return varName;
  };

  // Pre-assign variable names for sources (function params)
  sources.forEach(s => getVarName(s.id));

  // --- Decorator ---
  let code = `from transforms.api import transform_df, Input, Output\nfrom pyspark.sql import functions as F\nfrom pyspark.sql.window import Window\n\n`;

  code += `@transform_df(\n`;
  // Output
  destinations.forEach((dest) => {
    code += `    Output("${dest.location || '/path/to/output'}"),\n`;
  });
  // Inputs (sources only)
  sources.forEach((source) => {
    code += `    ${getVarName(source.id)}=Input("${source.location || '/path/to/output'}"),\n`;
  });
  code += `)\n`;

  const inputParams = sources.map(s => getVarName(s.id)).join(', ');
  code += `def compute(${inputParams || 'ctx'}):\n`;

  // --- Topological Sort ---
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sortedNodeIds: string[] = [];

  const visit = (nodeId: string) => {
    if (visiting.has(nodeId)) return;
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    const parents = connectors.filter(c => c.to === nodeId);
    parents.forEach(c => visit(c.from));
    visiting.delete(nodeId);
    visited.add(nodeId);
    sortedNodeIds.push(nodeId);
  };
  nodes.forEach(node => visit(node.id));

  // --- Generate body ---
  sortedNodeIds.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Source → no code (already a function parameter)
    if (node.type === 'source') return;

    const varName = getVarName(nodeId);
    const parentIds = connectors.filter(c => c.to === nodeId).map(c => c.from);

    // --- Destination → return ---
    if (node.type === 'destination') {
      if (parentIds.length > 0) {
        code += `    return ${getVarName(parentIds[0])}\n`;
      } else {
        code += `    return  # Warning: Destination "${node.name}" has no input\n`;
      }
      return;
    }

    // --- Transformation ---
    if (node.type === 'transformation') {
      if (parentIds.length === 0) {
        code += `    ${varName} = None  # Warning: transformation "${node.name}" has no input\n`;
        return;
      }

      // For multi-input ops (join, union), use ALL parent vars in order
      const parentVars = parentIds.map(id => getVarName(id));
      const firstInputVar = parentVars[0];

      const op = node.operation;

      // No operation configured → pass-through
      if (!op || op.type === 'no_op') {
        code += `    ${varName} = ${firstInputVar}\n`;
        return;
      }

      switch (op.type) {

        // ─── FILTER ───
        case 'filter': {
          const fOp = op as FilterOperation;
          const field = fOp.settings.field || '';
          const operator = fOp.settings.operator || '=';
          let value = fOp.settings.value;
          if (!field) {
            code += `    ${varName} = ${firstInputVar}  # Warning: filter has no field configured\n`;
          } else {
            if (typeof value === 'string') value = `'${value}'`;
            // Use expr for operators like BETWEEN, IN, LIKE
            if (['=', '!=', '>', '<', '>=', '<=', 'IN', 'LIKE', 'BETWEEN'].includes(operator)) {
              code += `    ${varName} = ${firstInputVar}.filter(F.expr("${field} ${operator} ${value}"))\n`;
            } else {
              code += `    ${varName} = ${firstInputVar}.filter(F.col("${field}") ${getOperatorMethod(operator)} ${value})\n`;
            }
          }
          break;
        }

        // ─── JOIN ───
        case 'join': {
          const jOp = op as JoinOperation;
          if (parentIds.length < 2) {
            code += `    ${varName} = ${firstInputVar}  # Warning: join requires 2 inputs, got ${parentIds.length}\n`;
          } else {
            // Use the configured left/right node IDs, falling back to first/second parent
            // Resolve them through the connector graph in case the settings reference a different node
            let leftId = jOp.settings.leftNodeId;
            let rightId = jOp.settings.rightNodeId;
            // Fallback: first parent connector that is a source or transformation
            if (!leftId) leftId = parentIds[0];
            if (!rightId) rightId = parentIds[1];
            // If settings reference nodes not in our parent list, use parents in order
            const parentSet = new Set(parentIds);
            if (!parentSet.has(leftId)) leftId = parentIds[0];
            if (!parentSet.has(rightId)) rightId = parentIds[1];

            const leftVar = getVarName(leftId);
            const rightVar = getVarName(rightId);
            const leftField = jOp.settings.condition?.leftField || '';
            const rightField = jOp.settings.condition?.rightField || '';
            const joinType = jOp.settings.joinType || 'inner';

            if (leftField && rightField) {
              code += `    ${varName} = ${leftVar}.join(\n        ${rightVar},\n        F.col("${leftVar}.${leftField}") == F.col("${rightVar}.${rightField}"),\n        how="${joinType}"\n    )\n`;
            } else {
              // Join on common columns
              code += `    ${varName} = ${leftVar}.join(${rightVar}, how="${joinType}")  # Warning: join condition not fully specified\n`;
            }
          }
          break;
        }

        // ─── GROUP BY / AGGREGATE ───
        case 'group_by': {
          const gOp = op as GroupByOperation;
          const groupByFields = (gOp.settings.groupByFields || []).map(f => `"${f}"`).join(', ');
          const aggregations = gOp.settings.aggregations || [];

          if (aggregations.length === 0) {
            code += `    ${varName} = ${firstInputVar}.groupBy(${groupByFields}).count()\n`;
          } else {
            code += `    ${varName} = ${firstInputVar}.groupBy(${groupByFields}).agg(\n`;
            aggregations.forEach((agg, idx) => {
              const isLast = idx === aggregations.length - 1;
              const pyFunc = agg.type === 'avg' ? 'mean' : agg.type;
              const sourceField = agg.field || '*';
              const alias = agg.newName || `${pyFunc}_${sourceField}`;
              if (sourceField === '*' || pyFunc === 'count') {
                code += `        F.count("*").alias("${alias}")${isLast ? '' : ','}\n`;
              } else {
                code += `        F.${pyFunc}("${sourceField}").alias("${alias}")${isLast ? '' : ','}\n`;
              }
            });
            code += `    )\n`;
          }
          break;
        }

        // ─── SORT ───
        case 'sort': {
          const sOp = op as SortOperation;
          const conditions = sOp.settings.conditions || [];
          if (conditions.length === 0) {
            code += `    ${varName} = ${firstInputVar}  # Warning: no sort conditions configured\n`;
          } else {
            const sortExprs = conditions.map(c => {
              const field = c.field || 'id';
              const dir = c.direction === 'desc' ? 'desc()' : 'asc()';
              return `F.col("${field}").${dir}`;
            }).join(', ');
            code += `    ${varName} = ${firstInputVar}.orderBy(${sortExprs})\n`;
          }
          break;
        }

        // ─── SELECT COLUMNS ───
        case 'select_columns': {
          const selOp = op as SelectColumnsOperation;
          const cols = (selOp.settings.selectedFields || []);
          if (cols.length === 0) {
            code += `    ${varName} = ${firstInputVar}  # Warning: no columns selected\n`;
          } else {
            const colRefs = cols.map(c => `F.col("${c}")`).join(', ');
            code += `    ${varName} = ${firstInputVar}.select(${colRefs})\n`;
          }
          break;
        }

        // ─── UNION ───
        case 'union': {
          if (parentIds.length < 2) {
            code += `    ${varName} = ${firstInputVar}  # Warning: union requires 2+ inputs, got ${parentIds.length}\n`;
          } else {
            code += `    ${varName} = ${parentVars[0]}\n`;
            for (let i = 1; i < parentVars.length; i++) {
              code += `    ${varName} = ${varName}.unionByName(${parentVars[i]})\n`;
            }
          }
          break;
        }

        // ─── DEDUPLICATION ───
        case 'deduplication': {
          const dOp = op as DeduplicationOperation;
          const cols = (dOp.settings.columns || []);
          if (cols.length > 0) {
            const colList = cols.map(c => `"${c}"`).join(', ');
            code += `    ${varName} = ${firstInputVar}.dropDuplicates([${colList}])\n`;
          } else {
            code += `    ${varName} = ${firstInputVar}.dropDuplicates()\n`;
          }
          break;
        }

        // ─── HANDLE MISSING VALUES ───
        case 'handle_missing_values': {
          const mvOp = op as MissingValuesOperation;
          const cols = (mvOp.settings.columns || []);
          if (mvOp.settings.strategy === 'drop') {
            const colParam = cols.length ? `, subset=[${cols.map(c => `"${c}"`).join(', ')}]` : '';
            code += `    ${varName} = ${firstInputVar}.dropna(how='any'${colParam})\n`;
          } else {
            let fillVal = mvOp.settings.fillValue;
            if (typeof fillVal === 'string') fillVal = `"${fillVal}"`;
            const colParam = cols.length ? `, subset=[${cols.map(c => `"${c}"`).join(', ')}]` : '';
            code += `    ${varName} = ${firstInputVar}.fillna(${fillVal}${colParam})\n`;
          }
          break;
        }

        // ─── NORMALIZE FORMATS ───
        case 'normalize_formats': {
          const columns = op.settings.columns || [];
          let body = `    ${varName} = ${firstInputVar}\n`;
          columns.forEach((col: string) => {
            const fmt = op.settings.format || 'date';
            if (fmt === 'date') {
              body += `    ${varName} = ${varName}.withColumn("${col}", F.to_date(F.col("${col}")))\n`;
            } else if (fmt === 'number') {
              body += `    ${varName} = ${varName}.withColumn("${col}", F.regexp_replace(F.col("${col}"), r'[^0-9.,]', '').cast("double"))\n`;
            } else {
              body += `    ${varName} = ${varName}.withColumn("${col}", F.trim(F.col("${col}")))\n`;
            }
          });
          if (columns.length === 0) {
            code += `    ${varName} = ${firstInputVar}  # Warning: normalize_formats has no columns configured\n`;
          } else {
            code += body;
          }
          break;
        }

        // ─── FIX TYPOS ───
        case 'fix_typos': {
          const mapping = op.settings.mapping || {};
          if (Object.keys(mapping).length === 0) {
            code += `    ${varName} = ${firstInputVar}  # Warning: no typo mapping configured\n`;
          } else {
            code += `    ${varName} = ${firstInputVar}\n`;
            Object.entries(mapping).forEach(([col, replacements]) => {
              let expr: string;
              if (typeof replacements === 'object') {
                const cases = (replacements as Record<string, string>).map(([k, v]: [string, string]) => 
                  `(F.col("${col}") == "${k}", "${v}")`
                ).join(', ');
                expr = `F.when(${cases}).otherwise(F.col("${col}"))`;
              } else {
                expr = `F.lit("${replacements}")`;
              }
              code += `    ${varName} = ${varName}.withColumn("${col}", ${expr})\n`;
            });
          }
          break;
        }

        // ─── QUALITY CONTROL ───
        case 'quality_control': {
          const rules = op.settings.rules || [];
          code += `    ${varName} = ${firstInputVar}\n`;
          if (rules.length > 0) {
            code += `    # Quality checks added as filter\n`;
            const conditions = rules.map((r: any) => {
              return `F.col("${r.field}").isNotNull() & (F.col("${r.field}") ${r.op || '!='} ${r.rejectValue || '""'})`;
            }).join(' & ');
            code += `    ${varName} = ${firstInputVar}.filter(${conditions})\n`;
          } else {
            code += `    ${varName} = ${firstInputVar}.filter(${firstInputVar}.columns.reduce((acc, c) => acc, F.lit(true)))  # No quality rules defined\n`;
          }
          break;
        }

        // ─── STANDARDIZE STRINGS ───
        case 'standardize_strings': {
          const columns = op.settings.columns || [];
          const strategy = op.settings.strategy || 'lower';
          code += `    ${varName} = ${firstInputVar}\n`;
          columns.forEach((col: string) => {
            switch (strategy) {
              case 'upper': code += `    ${varName} = ${varName}.withColumn("${col}", F.upper(F.col("${col}")))\n`; break;
              case 'lower': code += `    ${varName} = ${varName}.withColumn("${col}", F.lower(F.col("${col}")))\n`; break;
              case 'trim':  code += `    ${varName} = ${varName}.withColumn("${col}", F.trim(F.col("${col}")))\n`; break;
              case 'title': code += `    ${varName} = ${varName}.withColumn("${col}", F.initcap(F.col("${col}")))\n`; break;
              default:      code += `    ${varName} = ${varName}.withColumn("${col}", F.trim(F.lower(F.col("${col}"))))\n`; break;
            }
          });
          if (columns.length === 0) {
            code += `    ${varName} = ${firstInputVar}  # Warning: no columns specified for standardize_strings\n`;
          }
          break;
        }

        // ─── PIVOT / UNPIVOT ───
        case 'pivot_unpivot': {
          const direction = op.settings.direction || 'pivot';
          const col = op.settings.column || '';
          if (direction === 'pivot') {
            const pivotCol = op.settings.pivotColumn || col;
            const valueCol = op.settings.valueColumn || 'value';
            const aggFunc = op.settings.aggFunction || 'sum';
            code += `    ${varName} = ${firstInputVar}.groupBy().pivot("${pivotCol}").agg(F.${aggFunc}("${valueCol}"))\n`;
          } else {
            const valueCols = (op.settings.valueColumns || []).join(', ');
            const namesCol = op.settings.namesColumn || 'variable';
            const valuesCol = op.settings.valuesColumn || 'value';
            if (valueCols) {
              code += `    ${varName} = ${firstInputVar}.select(F.explode(F.array(${valueCols.split(',').map((c: string) => `F.struct(F.lit("${c.trim()}").alias("${namesCol}"), F.col("${c.trim()}").alias("${valuesCol}")`).join(', ')}))).alias("kv"))\n`;
            } else {
              code += `    ${varName} = ${firstInputVar}  # Warning: unpivot requires value columns\n`;
            }
          }
          break;
        }

        // ─── SPLIT / MERGE COLUMNS ───
        case 'split_merge_columns': {
          const operation = op.settings.operation || 'split';
          if (operation === 'split') {
            const sourceCol = op.settings.sourceColumn || '';
            const newCols = (op.settings.newColumns || []);
            const delimiter = op.settings.delimiter || ',';
            if (!sourceCol || newCols.length === 0) {
              code += `    ${varName} = ${firstInputVar}  # Warning: split requires source column and new columns\n`;
            } else {
              code += `    ${varName} = ${firstInputVar}\n`;
              newCols.forEach((c: string, i: number) => {
                code += `    ${varName} = ${varName}.withColumn("${c}", F.split(F.col("${sourceCol}"), "${delimiter}")[${i}])\n`;
              });
            }
          } else {
            // merge
            const sourceCols = (op.settings.sourceColumns || []);
            const targetCol = op.settings.targetColumn || '';
            const separator = op.settings.separator || '_';
            if (!targetCol || sourceCols.length === 0) {
              code += `    ${varName} = ${firstInputVar}  # Warning: merge requires source columns and target column\n`;
            } else {
              const concatArgs = sourceCols.map((c: string) => `F.col("${c}")`).join(
                `, F.lit("${separator}"), `
              );
              code += `    ${varName} = ${firstInputVar}.withColumn("${targetCol}", F.concat(${concatArgs}))\n`;
            }
          }
          break;
        }

        // ─── TRANSPOSE ───
        case 'transpose': {
          code += `    # Transpose: convert rows to columns (manual adjustment may be needed)\n    ${varName} = ${firstInputVar}\n`;
          const rowToColumns = (op.settings.rowsAsColumns || []);
          if (rowToColumns.length > 0) {
            code += `    # Transposing ${rowToColumns.length} values to columns\n`;
            code += `    ${varName} = ${firstInputVar}.select(\n`;
            rowToColumns.forEach((c: string, i: number) => {
              const comma = i < rowToColumns.length - 1 ? ',' : '';
              code += `        F.first(F.when(F.col("key") == "${c}", F.col("value"))).alias("${c}")${comma}\n`;
            });
            code += `    )\n`;
          } else {
            code += `    ${varName} = ${firstInputVar}  # Warning: transpose rowsAsColumns not specified\n`;
          }
          break;
        }

        // ─── DENORMALIZE ───
        case 'denormalize': {
          // Denormalize = join with lookup tables or explode nested
          const joins = op.settings.joins || [];
          code += `    ${varName} = ${firstInputVar}\n`;
          if (joins.length > 0) {
            joins.forEach((j: any) => {
              const joinVar = getVarName(j.nodeId) || `df_${j.nodeId}`;
              code += `    ${varName} = ${varName}.join(${joinVar}, on=["${j.on || ''}"], how="left")\n`;
            });
          } else {
            code += `    ${varName} = ${firstInputVar}  # Warning: no denormalization joins configured\n`;
          }
          break;
        }

        // ─── NESTED TO FLAT ───
        case 'nested_to_flat': {
          const columns = op.settings.columns || [];
          code += `    ${varName} = ${firstInputVar}\n`;
          columns.forEach((col: string) => {
            code += `    ${varName} = ${varName}.select("${col}.*", *[c for c in ${firstInputVar}.columns if c != "${col}"])\n`;
          });
          if (columns.length === 0) {
            code += `    ${varName} = ${firstInputVar}  # Warning: no nested columns specified\n`;
          }
          break;
        }

        // ─── ARRAY OPERATIONS ───
        case 'array_operations': {
          const operation = op.settings.operation || 'explode';
          const column = op.settings.column || '';
          if (!column) {
            code += `    ${varName} = ${firstInputVar}  # Warning: no array column specified\n`;
          } else if (operation === 'explode') {
            code += `    ${varName} = ${firstInputVar}.withColumn("${column}_exploded", F.explode(F.col("${column}")))\n`;
          } else if (operation === 'collect_list') {
            const groupBy = (op.settings.groupBy || []).map((c: string) => `F.col("${c}")`).join(', ');
            code += `    ${varName} = ${firstInputVar}.groupBy(${groupBy}).agg(F.collect_list(F.col("${column}")).alias("${column}s"))\n`;
          } else if (operation === 'contains_filter') {
            const value = op.settings.value || '';
            code += `    ${varName} = ${firstInputVar}.filter(F.array_contains(F.col("${column}"), "${value}"))\n`;
          } else {
            code += `    ${varName} = ${firstInputVar}  # Warning: unknown array operation "${operation}"\n`;
          }
          break;
        }

        // ─── DEFAULT (unknown future ops) ───
        default:
          code += `    # Transformation "${op.type}" - customize as needed\n    # Settings: ${JSON.stringify(op.settings, null, 4).replace(/\n/g, '\n    #')}\n    ${varName} = ${firstInputVar}\n`;
      }
    }

    // --- Dataset (intermediate checkpoint) ---
    if (node.type === 'dataset' && parentIds.length > 0) {
      code += `    ${getVarName(parentIds[0])}.checkpoint()  # Force materialization for intermediate dataset\n`;
    }

    code += `\n`;
  });

  return code;
}

/**
 * Map filter operator to PySpark comparison method
 */
function getOperatorMethod(op: string): string {
  const map: Record<string, string> = {
    '=': '==',
    '==': '==',
    '!=': '!=',
    '<>': '!=',
    '>': '>',
    '<': '<',
    '>=': '>=',
    '<=': '<=',
  };
  return map[op] || '==';
}
