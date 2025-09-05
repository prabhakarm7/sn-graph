MATCH (c:COMPANY) WHERE c.region IS NOT NULL
WITH c LIMIT 5
OPTIONAL MATCH (c)-[:OWNS]->(p:PRODUCT)
OPTIONAL MATCH (cons:CONSULTANT)-[:COVERS]->(c)
OPTIONAL MATCH (cons)-[rating:RATES]->(p)

RETURN {
    // Raw values to inspect manually
    region: c.region,
    sales_region: c.sales_region,
    channel: c.channel,
    pca: c.pca,
    aca: c.aca,
    asset_class: p.asset_class,
    consultant_pca: cons.pca,
    consultant_advisor: cons.consultant_advisor,
    rating_rankgroup: rating.rankgroup,
    rating_influence: rating.level_of_influence
} AS raw_values

MATCH (c:COMPANY) WHERE c.region IS NOT NULL
WITH c LIMIT 5
OPTIONAL MATCH (c)-[:OWNS]->(p:PRODUCT)
OPTIONAL MATCH (cons:CONSULTANT)-[:EMPLOYS]->(fc:FIELD_CONSULTANT)-[:COVERS]->(c)
OPTIONAL MATCH (cons2:CONSULTANT)-[:COVERS]->(c)
OPTIONAL MATCH (cons)-[rating:RATES]->(p)

RETURN {
    // Company properties
    company_region: c.region,
    company_region_type: apoc.meta.type(c.region),
    company_sales_region: c.sales_region,
    company_sales_region_type: apoc.meta.type(c.sales_region),
    company_channel: c.channel,
    company_channel_type: apoc.meta.type(c.channel),
    company_pca: c.pca,
    company_pca_type: apoc.meta.type(c.pca),
    company_aca: c.aca,
    company_aca_type: apoc.meta.type(c.aca),
    
    // Product properties
    product_asset_class: p.asset_class,
    product_asset_class_type: apoc.meta.type(p.asset_class),
    
    // Consultant properties
    consultant_pca: cons.pca,
    consultant_pca_type: apoc.meta.type(cons.pca),
    consultant_advisor: cons.consultant_advisor,
    consultant_advisor_type: apoc.meta.type(cons.consultant_advisor),
    
    // Relationship properties
    rating_rankgroup: rating.rankgroup,
    rating_rankgroup_type: apoc.meta.type(rating.rankgroup),
    rating_level_of_influence: rating.level_of_influence,
    rating_influence_type: apoc.meta.type(rating.level_of_influence)
} AS property_analysis
LIMIT 3