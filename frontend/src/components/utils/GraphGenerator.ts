// utils/GraphGenerator.ts
import { Node, Edge } from 'reactflow';
import { AppNodeData, EdgeData, RankGroup } from '../types/GraphTypes';

export function generateSampleGraph({
  consultants = 3,
  fieldPerConsultant = 2,
  companiesPerField = 2,
  productsPerCompany = 2,
}: {
  consultants?: number;
  fieldPerConsultant?: number;
  companiesPerField?: number;
  productsPerCompany?: number;
}) {
  const nodes: Node<AppNodeData>[] = [];
  const edges: Edge<EdgeData>[] = [];
  
  const regions = ['North America', 'Europe', 'Asia Pacific'];
  const salesRegions = ['East', 'West', 'Central', 'International'];
  const channels = ['Direct', 'Partner', 'Digital', 'Institutional'];
  const assetClasses = ['Equities', 'Fixed Income', 'Real Estate', 'Commodities', 'Alternatives'];
  const privacyLevels = ['Public', 'Private', 'Confidential'];
  
  // 🆕 FIXED: Only three mandate statuses as specified
  const mandateStatuses = ['Active', 'At Risk', 'Conversion in Progress'];
  
  const rankgroups: RankGroup[] = ['Introduced', 'Positive', 'Negative'];

  // Generate consultants
  for (let c = 1; c <= consultants; c++) {
    nodes.push({
      id: `C${c}`,
      type: 'CONSULTANT',
      data: { 
        id: `CONS_${c}`,
        name: `Senior Consultant ${c}`,
        label: `Senior Consultant ${c}`,
        region: regions[Math.floor(Math.random() * regions.length)],
        pca: `PCA_${c}`,
        aca: `ACA_${c}`,
        sales_region: salesRegions[Math.floor(Math.random() * salesRegions.length)],
        channel: channels[Math.floor(Math.random() * channels.length)]
      },
      position: { x: 0, y: 0 },
    });
  }

  let fIdx = 0, coIdx = 0, pIdx = 0;

  // Generate field consultants, clients, and products
  for (let c = 1; c <= consultants; c++) {
    for (let f = 1; f <= fieldPerConsultant; f++) {
      fIdx++;
      const fId = `F${fIdx}`;
      nodes.push({
        id: fId,
        type: 'FIELD_CONSULTANT',
        data: { 
          id: `FIELD_${fIdx}`,
          name: `Field Consultant ${fIdx}`,
          label: `Field Consultant ${fIdx}`
        },
        position: { x: 0, y: 0 },
      });
      
      // Consultant to Field Consultant relationship
      edges.push({ 
        id: `eC${c}-F${fIdx}`, 
        source: `C${c}`, 
        target: fId, 
        type: 'custom', 
        data: { 
          relType: 'EMPLOYS',
          sourceId: `CONS_${c}`,
          targetId: `FIELD_${fIdx}`
        } 
      });

      for (let co = 1; co <= companiesPerField; co++) {
        coIdx++;
        const coId = `CO${coIdx}`;
        const fieldInfluenceOnClient = Math.floor(Math.random() * 4) + 1; // 1-4 scale for field consultant influence on client
        
        nodes.push({
          id: coId,
          type: 'COMPANY',
          data: { 
            id: `CLIENT_${coIdx}`,
            name: `Client ${coIdx}`,
            label: `Client ${coIdx}`,
            region: regions[Math.floor(Math.random() * regions.length)],
            privacy: privacyLevels[Math.floor(Math.random() * privacyLevels.length)],
            pca: `PCA_${Math.ceil(Math.random() * consultants)}`,
            sales_region: salesRegions[Math.floor(Math.random() * salesRegions.length)],
            channel: channels[Math.floor(Math.random() * channels.length)],
            aca: `ACA_${Math.ceil(Math.random() * consultants)}`
          },
          position: { x: 0, y: 0 },
        });

        // Field Consultant to Client COVERS relationship (with level of influence)
        edges.push({ 
          id: `eF${fIdx}-CO${coIdx}`, 
          source: fId, 
          target: coId, 
          type: 'custom', 
          data: { 
            relType: 'COVERS',
            sourceId: `FIELD_${fIdx}`,
            targetId: `CLIENT_${coIdx}`,
            levelOfInfluence: fieldInfluenceOnClient
          } 
        });

        for (let p = 1; p <= productsPerCompany; p++) {
          pIdx++;
          const pId = `P${pIdx}`;
          
          // Initialize product with empty ratings array
          nodes.push({
            id: pId,
            type: 'PRODUCT',
            data: { 
              id: `PROD_${pIdx}`,
              name: `Product ${pIdx}`,
              label: `Product ${pIdx}`, 
              ratings: [],
              asset_class: assetClasses[Math.floor(Math.random() * assetClasses.length)],
              product_label: `Label_${pIdx}`
            },
            position: { x: 0, y: 0 },
          });

          // 🆕 FIXED: Client to Product relationship with correct mandate status
          const mandateStatus = mandateStatuses[Math.floor(Math.random() * mandateStatuses.length)];
          const influencedConsultant = `CONS_${Math.ceil(Math.random() * consultants)}`;
          
          console.log(`🔗 Creating OWNS relationship: ${coId} -> ${pId} with mandate status: ${mandateStatus}`);
          
          edges.push({ 
            id: `eCO${coIdx}-P${pIdx}`, 
            source: coId, 
            target: pId, 
            type: 'custom', 
            data: { 
              relType: 'OWNS',
              sourceId: `CLIENT_${coIdx}`,
              targetId: `PROD_${pIdx}`,
              mandateStatus: mandateStatus,
              influencedConsultant: influencedConsultant
            } 
          });
        }
      }
    }
  }

  // Now add consultant ratings for products (separate from the hierarchy)
  const products = nodes.filter(n => n.type === 'PRODUCT');
  const consultantNodes = nodes.filter(n => n.type === 'CONSULTANT');
  
  for (const product of products) {
    // Each product gets rated by 2-3 random consultants
    const numRatings = Math.floor(Math.random() * 2) + 2; // 2-3 ratings
    const ratingConsultants = consultantNodes
      .sort(() => 0.5 - Math.random())
      .slice(0, numRatings);
    
    const ratings = ratingConsultants.map(consultant => ({
      consultant: consultant.data?.label || consultant.id,
      rankgroup: rankgroups[Math.floor(Math.random() * rankgroups.length)]
    }));
    
    // Update product data with ratings
    product.data = { ...product.data, ratings };
    
    // Note: We store ratings data but don't create visual edges
    // The ratings are displayed in the product node itself
  }

  console.log(`✅ Generated graph with ${mandateStatuses.length} mandate statuses: ${mandateStatuses.join(', ')}`);
  
  return { nodes, edges };
}

export function addCrossLinks(
  nodes: Node<AppNodeData>[],
  edges: Edge<EdgeData>[],
  opts: { extraCoversPerField?: number; extraRatingsPerProduct?: number } = {}
) {
  const { extraCoversPerField = 2, extraRatingsPerProduct = 3 } = opts;

  const fields = nodes.filter(n => n.type === 'FIELD_CONSULTANT');
  const companies = nodes.filter(n => n.type === 'COMPANY');
  const products = nodes.filter(n => n.type === 'PRODUCT');
  const consultants = nodes.filter(n => n.type === 'CONSULTANT');

  // Add overlap coverage: each field takes on a few random extra companies
  let eid = 100000;
  for (const f of fields) {
    let attempts = 0;
    for (let k = 0; k < extraCoversPerField; k++) {
      const co = companies[Math.floor(Math.random() * companies.length)];
      if (edges.some(e => e.source === f.id && e.target === co.id)) {
        if (attempts++ < 5) { k--; }
        continue;
      }
      
      // Random level of influence for extra coverage
      const levelOfInfluence = Math.floor(Math.random() * 4) + 1; // 1-4 scale
      
      edges.push({
        id: `x-cover-${eid++}`,
        source: f.id,
        target: co.id,
        type: 'custom',
        data: { 
          relType: 'COVERS', 
          levelOfInfluence: levelOfInfluence,
          sourceId: f.data?.id,
          targetId: co.data?.id
        },
      });
    }
  }

  // Add more consultant ratings to products
  const rankgroups: RankGroup[] = ['Introduced', 'Positive', 'Negative', 'Neutral'];
  for (const p of products) {
    const data = p.data || {};
    const existing = new Set((data.ratings || []).map((r: any) => r.consultant));
    const ratings = [...(data.ratings || [])];

    let added = 0;
    let tries = 0;
    while (added < extraRatingsPerProduct && tries < consultants.length * 2) {
      const c = consultants[Math.floor(Math.random() * consultants.length)];
      const cname = c.data?.label || c.id;
      if (!existing.has(cname)) {
        existing.add(cname);
        const rankgroup = rankgroups[Math.floor(Math.random() * rankgroups.length)];
        ratings.push({
          consultant: cname,
          rankgroup: rankgroup,
        });
        
        // Note: We add ratings data but don't create visual RATES edges
        // The ratings are displayed in the product node itself
        
        added++;
      }
      tries++;
    }
    p.data = { ...data, ratings };
  }

  return { nodes, edges };
}