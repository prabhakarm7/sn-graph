// utils/GraphDebugHelper.ts - Debug utility for data transformation issues

export const debugGraphData = (nodes: any[], edges: any[], source: string = 'unknown') => {
  console.log(`🔍 [${source}] GRAPH DEBUG ANALYSIS:`);
  
  // Node Analysis
  console.log('\n📊 NODE ANALYSIS:');
  console.log(`Total nodes: ${nodes.length}`);
  
  const nodesByType = nodes.reduce((acc, node) => {
    const type = node.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  console.table(nodesByType);
  
  // Sample product ratings
  const productNodes = nodes.filter(n => n.type === 'PRODUCT' || n.type === 'INCUMBENT_PRODUCT');
  console.log(`\n🏦 PRODUCT NODES (${productNodes.length}):`);
  productNodes.slice(0, 3).forEach(product => {
    console.log(`  - ${product.id}: ${product.data?.name}`);
    console.log(`    Ratings:`, product.data?.ratings);
    console.log(`    Asset Class:`, product.data?.asset_class);
  });
  
  // Edge Analysis
  console.log('\n🔗 EDGE ANALYSIS:');
  console.log(`Total edges: ${edges.length}`);
  
  const edgesByType = edges.reduce((acc, edge) => {
    const type = edge.data?.relType || edge.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  console.table(edgesByType);
  
  // Sample edge data
  console.log('\n📋 SAMPLE EDGE DATA:');
  const sampleEdges = edges.slice(0, 5);
  sampleEdges.forEach(edge => {
    console.log(`  Edge ${edge.id}:`);
    console.log(`    Type: ${edge.data?.relType || 'unknown'}`);
    console.log(`    Source: ${edge.source} -> Target: ${edge.target}`);
    console.log(`    Data:`, edge.data);
    
    if (edge.data?.relType === 'COVERS') {
      console.log(`    ⭐ Level of Influence: ${edge.data.levelOfInfluence || edge.data.level_of_influence || 'missing'}`);
    }
    
    if (edge.data?.relType === 'OWNS') {
      console.log(`    📋 Mandate Status: ${edge.data.mandateStatus || edge.data.mandate_status || 'missing'}`);
    }
    
    if (edge.data?.relType === 'RATES') {
      console.log(`    ⭐ Rating: ${edge.data.rating || edge.data.rankgroup || 'missing'}`);
    }
  });
  
  // Color Analysis
  console.log('\n🎨 COLOR COORDINATION CHECK:');
  const consultantNodes = nodes.filter(n => n.type === 'CONSULTANT');
  const fieldConsultantNodes = nodes.filter(n => n.type === 'FIELD_CONSULTANT');
  
  console.log(`Consultants: ${consultantNodes.length}`);
  consultantNodes.slice(0, 3).forEach(consultant => {
    console.log(`  - ${consultant.id}: ${consultant.data?.name}`);
  });
  
  console.log(`Field Consultants: ${fieldConsultantNodes.length}`);
  fieldConsultantNodes.slice(0, 3).forEach(fieldConsultant => {
    console.log(`  - ${fieldConsultant.id}: ${fieldConsultant.data?.name}`);
    console.log(`    Parent Consultant ID: ${fieldConsultant.data?.parentConsultantId || 'not set'}`);
    console.log(`    PCA: ${fieldConsultant.data?.pca || 'not set'}`);
  });
  
  // Missing Data Check
  console.log('\n❌ MISSING DATA CHECK:');
  const missingRatings = productNodes.filter(p => !p.data?.ratings || p.data.ratings.length === 0);
  console.log(`Products without ratings: ${missingRatings.length}/${productNodes.length}`);
  
  const coversEdges = edges.filter(e => e.data?.relType === 'COVERS');
  const coversWithoutInfluence = coversEdges.filter(e => 
    !e.data?.levelOfInfluence && !e.data?.level_of_influence
  );
  console.log(`COVERS edges without influence level: ${coversWithoutInfluence.length}/${coversEdges.length}`);
  
  const ownsEdges = edges.filter(e => e.data?.relType === 'OWNS');
  const ownsWithoutStatus = ownsEdges.filter(e => 
    !e.data?.mandateStatus && !e.data?.mandate_status
  );
  console.log(`OWNS edges without mandate status: ${ownsWithoutStatus.length}/${ownsEdges.length}`);
  
  console.log('\n✅ DEBUG ANALYSIS COMPLETE');
  
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodesByType,
    edgesByType,
    issues: {
      productsWithoutRatings: missingRatings.length,
      coversWithoutInfluence: coversWithoutInfluence.length,
      ownsWithoutStatus: ownsWithoutStatus.length
    }
  };
};

// Enhanced data transformation checker
export const validateGraphDataTransformation = (
  originalData: any, 
  transformedNodes: any[], 
  transformedEdges: any[]
) => {
  console.log('🔧 VALIDATING DATA TRANSFORMATION:');
  
  console.log('\n📥 ORIGINAL DATA:');
  console.log(`  Nodes: ${originalData.nodes?.length || 0}`);
  console.log(`  Relationships: ${originalData.relationships?.length || 0}`);
  
  if (originalData.nodes?.length > 0) {
    const sampleNode = originalData.nodes[0];
    console.log('  Sample original node:', sampleNode);
  }
  
  if (originalData.relationships?.length > 0) {
    const sampleRel = originalData.relationships[0];
    console.log('  Sample original relationship:', sampleRel);
  }
  
  console.log('\n📤 TRANSFORMED DATA:');
  console.log(`  Nodes: ${transformedNodes.length}`);
  console.log(`  Edges: ${transformedEdges.length}`);
  
  if (transformedNodes.length > 0) {
    const sampleNode = transformedNodes[0];
    console.log('  Sample transformed node:', {
      id: sampleNode.id,
      type: sampleNode.type,
      data: sampleNode.data,
      position: sampleNode.position
    });
  }
  
  if (transformedEdges.length > 0) {
    const sampleEdge = transformedEdges[0];
    console.log('  Sample transformed edge:', {
      id: sampleEdge.id,
      source: sampleEdge.source,
      target: sampleEdge.target,
      type: sampleEdge.type,
      data: sampleEdge.data
    });
  }
  
  // Check for data loss
  const dataLossCheck = {
    nodeCountMismatch: (originalData.nodes?.length || 0) !== transformedNodes.length,
    edgeCountMismatch: (originalData.relationships?.length || 0) !== transformedEdges.length,
    missingNodeTypes: transformedNodes.some(n => !n.type),
    missingEdgeTypes: transformedEdges.some(e => !e.data?.relType),
    missingNodeData: transformedNodes.some(n => !n.data?.name),
  };
  
  console.log('\n⚠️ DATA LOSS CHECK:', dataLossCheck);
  
  return dataLossCheck;
};

// Helper to fix common data issues
export const fixGraphDataIssues = (nodes: any[], edges: any[]) => {
  console.log('🔧 FIXING COMMON GRAPH DATA ISSUES:');
  
  let fixedNodes = [...nodes];
  let fixedEdges = [...edges];
  
  // Fix 1: Ensure all product nodes have ratings array
  fixedNodes = fixedNodes.map(node => {
    if ((node.type === 'PRODUCT' || node.type === 'INCUMBENT_PRODUCT') && !node.data?.ratings) {
      console.log(`  ✅ Fixed missing ratings for product: ${node.id}`);
      return {
        ...node,
        data: {
          ...node.data,
          ratings: []
        }
      };
    }
    return node;
  });
  
  // Fix 2: Normalize edge data property names
  fixedEdges = fixedEdges.map(edge => {
    let fixedData = { ...edge.data };
    
    // Normalize mandate status
    if (!fixedData.mandateStatus && fixedData.mandate_status) {
      fixedData.mandateStatus = fixedData.mandate_status;
      console.log(`  ✅ Normalized mandate_status to mandateStatus for edge: ${edge.id}`);
    }
    
    // Normalize level of influence
    if (!fixedData.levelOfInfluence && fixedData.level_of_influence) {
      fixedData.levelOfInfluence = fixedData.level_of_influence;
      console.log(`  ✅ Normalized level_of_influence to levelOfInfluence for edge: ${edge.id}`);
    }
    
    // Normalize rating
    if (!fixedData.rating && fixedData.rankgroup) {
      fixedData.rating = fixedData.rankgroup;
      console.log(`  ✅ Normalized rankgroup to rating for edge: ${edge.id}`);
    }
    
    return {
      ...edge,
      data: fixedData
    };
  });
  
  // Fix 3: Add missing parent consultant relationships for field consultants
  const consultantNodes = fixedNodes.filter(n => n.type === 'CONSULTANT');
  const fieldConsultantNodes = fixedNodes.filter(n => n.type === 'FIELD_CONSULTANT');
  
  fixedNodes = fixedNodes.map(node => {
    if (node.type === 'FIELD_CONSULTANT' && !node.data?.parentConsultantId) {
      // Try to find parent consultant based on naming pattern
      const nodeId = node.id || '';
      let parentId = '';
      
      if (nodeId.includes('_F')) {
        parentId = nodeId.replace('_F', '_C');
      } else {
        // Use first consultant as fallback
        parentId = consultantNodes[0]?.id || '';
      }
      
      if (parentId) {
        console.log(`  ✅ Added parentConsultantId ${parentId} to field consultant: ${node.id}`);
        return {
          ...node,
          data: {
            ...node.data,
            parentConsultantId: parentId
          }
        };
      }
    }
    return node;
  });
  
  console.log('✅ GRAPH DATA FIXES COMPLETE');
  
  return { fixedNodes, fixedEdges };
};