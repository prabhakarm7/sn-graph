CALL {
    // Query 1: Consultant -> Field Consultant -> Company -> Product (Full Path)
    OPTIONAL MATCH (cons:CONSULTANT)-[emp_rel:EMPLOYS]->(fc:FIELD_CONSULTANT)-[cov_rel:COVERS]->(c:COMPANY)-[owns_rel:OWNS]->(p:PRODUCT)
    WHERE (c.region = $region OR $region IN c.region) 
    AND cons.name IN $consultantIds
    RETURN cons as consultant, fc as field_consultant, c as company, p as product,
        emp_rel as rel1, cov_rel as rel2, owns_rel as rel3, 'full_path' as path_type
    
    UNION
    
    // Query 2: Consultant -> Company -> Product (Direct Coverage)
    OPTIONAL MATCH (cons:CONSULTANT)-[cov_rel:COVERS]->(c:COMPANY)-[owns_rel:OWNS]->(p:PRODUCT)
    WHERE (c.region = $region OR $region IN c.region) 
    AND cons.name IN $consultantIds
    RETURN cons as consultant, null as field_consultant, c as company, p as product,
        cov_rel as rel1, null as rel2, owns_rel as rel3, 'direct_consultant' as path_type
    
    UNION
    
    // Query 3: Field Consultant -> Company -> Product (When FC connected to filtered consultants)
    OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov_rel:COVERS]->(c:COMPANY)-[owns_rel:OWNS]->(p:PRODUCT)
    WHERE (c.region = $region OR $region IN c.region) 
    AND EXISTS {
        MATCH (cons:CONSULTANT)-[:EMPLOYS]->(fc)
        WHERE cons.name IN $consultantIds
    }
    RETURN null as consultant, fc as field_consultant, c as company, p as product,
        null as rel1, cov_rel as rel2, owns_rel as rel3, 'field_consultant_only' as path_type
    
    UNION
    
    // Query 4: Company -> Product (Only companies connected to filtered consultants)
    OPTIONAL MATCH (c:COMPANY)-[owns_rel:OWNS]->(p:PRODUCT)
    WHERE (c.region = $region OR $region IN c.region) 
    AND EXISTS {
        MATCH (cons:CONSULTANT)
        WHERE cons.name IN $consultantIds
        AND ((cons)-[:COVERS]->(c) OR (cons)-[:EMPLOYS]->(:FIELD_CONSULTANT)-[:COVERS]->(c))
    }
    RETURN null as consultant, null as field_consultant, c as company, p as product,
        null as rel1, null as rel2, owns_rel as rel3, 'company_product_only' as path_type
}

// Aggregate results from all paths
WITH 
    COLLECT(DISTINCT consultant) as all_consultants,
    COLLECT(DISTINCT field_consultant) as all_field_consultants,
    COLLECT(DISTINCT company) as all_companies,
    COLLECT(DISTINCT product) as all_products,
    COLLECT(DISTINCT rel1) + COLLECT(DISTINCT rel2) + COLLECT(DISTINCT rel3) as all_relationships

// Remove nulls
WITH 
    [x IN all_consultants WHERE x IS NOT NULL] as consultants,
    [x IN all_field_consultants WHERE x IS NOT NULL] as field_consultants,
    [x IN all_companies WHERE x IS NOT NULL] as companies,
    [x IN all_products WHERE x IS NOT NULL] as products,
    [x IN all_relationships WHERE x IS NOT NULL] as relationships

WITH consultants + field_consultants + companies + products as allNodes,
    relationships,
    products as ratable_products

// Get ratings for products
UNWIND ratable_products AS target_product
OPTIONAL MATCH (rating_consultant:CONSULTANT)-[rating_rel:RATES]->(target_product)

WITH allNodes, relationships,
    target_product.id AS product_id,
    COLLECT({
        consultant: rating_consultant.name,
        rankgroup: rating_rel.rankgroup,
        rankvalue: rating_rel.rankvalue
    }) AS product_ratings

WITH allNodes, relationships,
    COLLECT({
        product_id: product_id,
        ratings: [rating IN product_ratings WHERE rating.consultant IS NOT NULL | rating]
    }) AS all_ratings_map

// Final filtering and formatting
WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
    [rel IN relationships WHERE rel IS NOT NULL] AS filteredRels,
    all_ratings_map

// Calculate statistics by node type
WITH filteredNodes, filteredRels, all_ratings_map,
    [node IN filteredNodes WHERE labels(node)[0] = 'CONSULTANT'] AS consultant_nodes,
    [node IN filteredNodes WHERE labels(node)[0] = 'FIELD_CONSULTANT'] AS field_consultant_nodes,
    [node IN filteredNodes WHERE labels(node)[0] = 'COMPANY'] AS company_nodes,
    [node IN filteredNodes WHERE labels(node)[0] = 'PRODUCT'] AS product_nodes

RETURN {
    nodes: [node IN filteredNodes | {
        id: node.id,
        type: labels(node)[0],
        data: {
            id: node.id,
            name: coalesce(node.name, node.id),
            label: coalesce(node.name, node.id),
            region: node.region,
            channel: node.channel,
            sales_region: node.sales_region,
            asset_class: node.asset_class,
            pca: node.pca,
            aca: node.aca,
            consultant_advisor: node.consultant_advisor,
            mandate_status: node.mandate_status,
            ratings: CASE 
                WHEN labels(node)[0] = 'PRODUCT' THEN
                    HEAD([rating_group IN all_ratings_map WHERE rating_group.product_id = node.id | rating_group.ratings])
                ELSE
                    null
            END
        }
    }],
    relationships: [rel IN filteredRels WHERE type(rel) <> 'RATES' | {
        id: toString(id(rel)),
        source: startNode(rel).id,
        target: endNode(rel).id,
        type: 'custom',
        data: {
            relType: type(rel),
            sourceId: startNode(rel).id,
            targetId: endNode(rel).id,
            rankgroup: rel.rankgroup,
            rankvalue: rel.rankvalue,
            rankorder: rel.rankorder,
            rating_change: rel.rating_change,
            level_of_influence: rel.level_of_influence,
            mandate_status: rel.mandate_status,
            consultant: rel.consultant,
            manager: rel.manager,
            commitment_market_value: rel.commitment_market_value,
            manager_since_date: rel.manager_since_date,
            multi_mandate_manager: rel.multi_mandate_manager,
            annualised_alpha_summary: rel.annualised_alpha_summary,
            batting_average_summary: rel.batting_average_summary,
            downside_market_capture_summary: rel.downside_market_capture_summary,
            information_ratio_summary: rel.information_ratio_summary,
            opportunity_type: rel.opportunity_type,
            returns: rel.returns,
            returns_summary: rel.returns_summary,
            standard_deviation_summary: rel.standard_deviation_summary,
            upside_market_capture_summary: rel.upside_market_capture_summary
        }
    }],
    statistics: {
        total_nodes: size(filteredNodes),
        total_relationships: size(filteredRels),
        node_breakdown: {
            consultants: size(consultant_nodes),
            field_consultants: size(field_consultant_nodes),
            companies: size(company_nodes),
            products: size(product_nodes)
        },
        filter_effectiveness: {
            filtered_consultants: [c.name IN consultant_nodes | c.name],
            connected_companies: [c.name IN company_nodes | c.name],
            available_products: [p.name IN product_nodes | p.name]
        },
        performance_metrics: {
            nodes_per_consultant: CASE 
                WHEN size(consultant_nodes) > 0 
                THEN round(size(filteredNodes) * 1.0 / size(consultant_nodes), 2)
                ELSE 0 
            END,
            relationship_density: CASE 
                WHEN size(filteredNodes) > 0 
                THEN round(size(filteredRels) * 1.0 / size(filteredNodes), 2)
                ELSE 0 
            END,
            filter_impact: "Only nodes connected to specified consultants included"
        }
    }
} AS GraphData