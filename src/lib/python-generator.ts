import { PipelineNode, Connector, JoinOperation, FilterOperation, GroupByOperation, SortOperation, SelectColumnsOperation, DeduplicationOperation, MissingValuesOperation } from './pipeline-data';

/**
 * Generates a Palantir Foundry PySpark transform script based on the pipeline.
 */
export function generatePythonCode(nodes: PipelineNode[] = [], connectors: Connector[] = []): string {
  if (!nodes || nodes.length === 0) {
    return "# No nodes defined in the pipeline canvas.";
  }

  const sources = nodes.filter(n => n.type === 'source');
  const destinations = nodes.filter(n => n.type === 'destination');
  
  let code = `from transforms.api import transform_df, Input, Output\nfrom pyspark.sql import functions as F\n\n`;

  // Helper to get variable name from node ID
  const getVarName = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return `df_${nodeId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const cleanName = node.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const shortId = node.id.split('-').pop() || 'node';
    return `${cleanName}_${shortId}`;
  };

  // Define the transform decorator
  code += `@transform_df(\n`;
  
  // Output
  destinations.forEach((dest) => {
    code += `    Output("${dest.location || '/path/to/output'}"),\n`;
  });

  // Inputs
  sources.forEach((source) => {
    code += `    ${getVarName(source.id)}=Input("${source.location || '/path/to/input'}"),\n`;
  });
  code += `)\n`;

  // Function signature
  const inputParams = sources.map(s => getVarName(s.id)).join(', ');
  code += `def compute(${inputParams || 'ctx'}):\n`;

  // Safe Topological Sort to ensure dependencies are defined first
  const visited = new Set<string>();
  const visiting = new Set<string>(); // Cycle detection
  const sortedNodeIds: string[] = [];

  const visit = (nodeId: string) => {
    if (visiting.has(nodeId)) return; 
    if (visited.has(nodeId)) return;
    
    visiting.add(nodeId);
    const parentConnectors = connectors.filter(c => c.to === nodeId);
    parentConnectors.forEach(c => visit(c.from));
    
    visiting.delete(nodeId);
    visited.add(nodeId);
    sortedNodeIds.push(nodeId);
  };

  nodes.forEach(node => visit(node.id));

  // Internal Logic
  sortedNodeIds.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.type === 'source') return; 
    
    if (node.type === 'destination') {
        const parentId = connectors.find(c => c.to === nodeId)?.from;
        if (parentId) {
            code += `    return ${getVarName(parentId)}\n`;
        } else {
            code += `    # Warning: Destination ${node.name} is not connected\n`;
        }
        return;
    }

    const varName = getVarName(nodeId);
    const parentIds = connectors.filter(c => c.to === nodeId).map(c => c.from);

    code += `    # Node: ${node.name}\n`;

    if (node.type === 'transformation') {
      const op = node.operation;
      if (!op || parentIds.length === 0) {
        if (parentIds.length > 0) {
          code += `    ${varName} = ${getVarName(parentIds[0])}\n`;
        } else {
          code += `    # Warning: Transformation ${node.name} has no input\n`;
        }
        code += `\n`;
        return;
      }

      const inputVar = getVarName(parentIds[0]);

      switch (op.type) {
        case 'filter': {
          const fOp = op as FilterOperation;
          let val = fOp.settings.value;
          if (typeof val === 'string') val = `'${val}'`;
          code += `    ${varName} = ${inputVar}.filter("${fOp.settings.field} ${fOp.settings.operator} ${val}")\n`;
          break;
        }

        case 'join': {
          const jOp = op as JoinOperation;
          if (parentIds.length >= 2) {
            const leftVar = getVarName(jOp.settings.leftNodeId || parentIds[0]);
            const rightVar = getVarName(jOp.settings.rightNodeId || parentIds[1]);
            code += `    ${varName} = ${leftVar}.join(\n        ${rightVar}, \n        ${leftVar}['${jOp.settings.condition.leftField}'] == ${rightVar}['${jOp.settings.condition.rightField}'], \n        how='${jOp.settings.joinType}'\n    )\n`;
          } else {
            code += `    ${varName} = ${inputVar}  # Join requires 2 inputs\n`;
          }
          break;
        }

        case 'group_by': {
          const gOp = op as GroupByOperation;
          const groupByCols = (gOp.settings.groupByFields || []).map(f => `'${f}'`).join(', ');
          
          code += `    ${varName} = ${inputVar}.groupBy(${groupByCols}).agg(\n`;
          (gOp.settings.aggregations || []).forEach((agg, idx) => {
            const isLast = idx === gOp.settings.aggregations.length - 1;
            const pyFunc = agg.type === 'avg' ? 'mean' : agg.type;
            code += `        F.${pyFunc}('${agg.field}').alias('${agg.newName}')${isLast ? '' : ','}\n`;
          });
          code += `    )\n`;
          break;
        }

        case 'sort': {
          const sOp = op as SortOperation;
          const sortExprs = (sOp.settings.conditions || []).map(c => `F.col('${c.field}').${c.direction}()`).join(', ');
          code += `    ${varName} = ${inputVar}.orderBy(${sortExprs || "F.col('id').asc()"})\n`;
          break;
        }

        case 'select_columns': {
          const selOp = op as SelectColumnsOperation;
          const cols = (selOp.settings.selectedFields || []).map(f => `'${f}'`).join(', ');
          code += `    ${varName} = ${inputVar}.select(${cols || '*'})\n`;
          break;
        }

        case 'deduplication': {
          const dOp = op as DeduplicationOperation;
          const cols = (dOp.settings.columns || []).map(f => `'${f}'`).join(', ');
          if (cols) {
             code += `    ${varName} = ${inputVar}.dropDuplicates([${cols}])\n`;
          } else {
             code += `    ${varName} = ${inputVar}.dropDuplicates()\n`;
          }
          break;
        }

        case 'handle_missing_values': {
          const mvOp = op as MissingValuesOperation;
          const cols = (mvOp.settings.columns || []);
          if (mvOp.settings.strategy === 'drop') {
             const colParam = cols.length ? `, subset=[${cols.map(c => `'${c}'`).join(', ')}]` : '';
             code += `    ${varName} = ${inputVar}.dropna(how='any'${colParam})\n`;
          } else {
             let fillVal = mvOp.settings.fillValue;
             if (typeof fillVal === 'string') fillVal = `'${fillVal}'`;
             const colParam = cols.length ? `, subset=[${cols.map(c => `'${c}'`).join(', ')}]` : '';
             code += `    ${varName} = ${inputVar}.fillna(${fillVal}${colParam})\n`;
          }
          break;
        }

        case 'union': {
          if (parentIds.length >= 2) {
            const otherVars = parentIds.slice(1).map(id => getVarName(id));
            code += `    ${varName} = ${inputVar}\n`;
            otherVars.forEach(v => {
               code += `    ${varName} = ${varName}.unionByName(${v})\n`;
            });
          } else {
            code += `    ${varName} = ${inputVar}\n`;
          }
          break;
        }

        default:
          code += `    # Custom transformation: ${op.type}\n`;
          code += `    # Settings: ${JSON.stringify(op.settings)}\n`;
          code += `    ${varName} = ${inputVar} # Pass-through by default\n`;
      }
    } else if (node.type === 'dataset') {
        if (parentIds.length > 0) {
            code += `    ${varName} = ${getVarName(parentIds[0])}.checkpoint() # Force materialization\n`;
        }
    }
    code += `\n`;
  });

  return code;
}