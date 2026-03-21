
import { PipelineNode, Connector, JoinOperation, FilterOperation, GroupByOperation, SortOperation } from './pipeline-data';

/**
 * Generates a Palantir Foundry PySpark transform script based on the pipeline.
 */
export function generatePythonCode(nodes: PipelineNode[], connectors: Connector[]): string {
  const sources = nodes.filter(n => n.type === 'source');
  const destinations = nodes.filter(n => n.type === 'destination');
  
  let code = `from transforms.api import transform_df, Input, Output\n\n`;

  // Helper to get variable name from node ID
  const getVarName = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return `df_${nodeId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return `${node.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${node.id.split('-').pop()}`;
  };

  // Define the transform decorator
  code += `@transform_df(\n`;
  
  // Output
  destinations.forEach((dest, i) => {
    code += `    Output("${dest.location || '/path/to/output'}"),\n`;
  });

  // Inputs
  sources.forEach((source) => {
    code += `    ${getVarName(source.id)}=Input("${source.location || '/path/to/input'}"),\n`;
  });
  code += `)\n`;

  // Function signature
  const inputParams = sources.map(s => getVarName(s.id)).join(', ');
  code += `def compute(${inputParams}):\n`;

  // Topological Sort to ensure dependencies are defined first
  const visited = new Set<string>();
  const sortedNodeIds: string[] = [];

  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    const parentConnectors = connectors.filter(c => c.to === nodeId);
    parentConnectors.forEach(c => visit(c.from));
    visited.add(nodeId);
    sortedNodeIds.push(nodeId);
  };

  nodes.forEach(node => visit(node.id));

  // Internal Logic
  sortedNodeIds.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId)!;
    if (node.type === 'source') return; // Handled in signature
    if (node.type === 'destination') {
        const parentId = connectors.find(c => c.to === nodeId)?.from;
        if (parentId) {
            code += `    return ${getVarName(parentId)}\n`;
        }
        return;
    }

    const varName = getVarName(nodeId);
    const parentIds = connectors.filter(c => c.to === nodeId).map(c => c.from);

    code += `    # Node: ${node.name}\n`;

    if (node.type === 'transformation') {
      const op = node.operation;
      if (!op) {
        if (parentIds.length > 0) {
          code += `    ${varName} = ${getVarName(parentIds[0])}\n`;
        }
        return;
      }

      switch (op.type) {
        case 'filter': {
          const fOp = op as FilterOperation;
          const inputVar = getVarName(parentIds[0]);
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
          }
          break;
        }

        case 'group_by': {
          const gOp = op as GroupByOperation;
          const gInputVar = getVarName(parentIds[0]);
          const groupByCols = gOp.settings.groupByFields.map(f => `'${f}'`).join(', ');
          
          code += `    from pyspark.sql import functions as F\n`;
          code += `    ${varName} = ${gInputVar}.groupBy(${groupByCols}).agg(\n`;
          gOp.settings.aggregations.forEach((agg, idx) => {
            const isLast = idx === gOp.settings.aggregations.length - 1;
            const pyFunc = agg.type === 'avg' ? 'mean' : agg.type;
            code += `        F.${pyFunc}('${agg.field}').alias('${agg.newName}')${isLast ? '' : ','}\n`;
          });
          code += `    )\n`;
          break;
        }

        case 'sort': {
          const sOp = op as SortOperation;
          const sInputVar = getVarName(parentIds[0]);
          const sortExprs = sOp.settings.conditions.map(c => `F.col('${c.field}').${c.direction}()`).join(', ');
          code += `    from pyspark.sql import functions as F\n`;
          code += `    ${varName} = ${sInputVar}.orderBy(${sortExprs})\n`;
          break;
        }

        default:
          code += `    ${varName} = ${getVarName(parentIds[0])}  # Placeholder for ${op.type}\n`;
      }
    } else if (node.type === 'dataset') {
        if (parentIds.length > 0) {
            code += `    ${varName} = ${getVarName(parentIds[0])}.checkpoint()  # Intermediate Cache\n`;
        }
    }
    code += `\n`;
  });

  return code;
}
