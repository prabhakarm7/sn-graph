#!/usr/bin/env python3
"""
Complete setup script for Neo4j database with nodes, relationships, and sample data.
This creates everything you need based on your schema.
FINAL CORRECTED: Region only on COMPANY, universe properties only on PRODUCT, fixed all references
UPDATED: Added consultant_id to FIELD_CONSULTANT nodes
"""
import asyncio
import random
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from neo4j import GraphDatabase
from faker import Faker

# Your Neo4j connection details
NEO4J_URI = "neo4j://localhost:7687"
NEO4J_USERNAME = "neo4j"
NEO4J_PASSWORD = "test1234"  # Replace with your actual password
NEO4J_DATABASE = "neo4j"

fake = Faker()
Faker.seed(42)
random.seed(42)

class SmartNetworkSetup:
    """Complete setup for Smart Network Neo4j database."""
    
    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
        )
        
        # Data configuration
        self.regions = ["NAI", "EMEA", "APAC"]
        self.sales_regions = ["East", "West", "Central", "International", "North", "South", "Europe", "Asia", "United States", "Australia", "Hong Kong"]
        self.channels = ["Consultant Sales", "North Americas Institutional DC", "Asia Institutional", "Beta Strategies"]
        self.asset_classes = ["Equities", "Fixed Income", "Real Estate", "Commodities", "Alternatives", "Multi-Asset"]
        self.privacy_levels = ["Public", "Private", "Confidential"]
        self.mandate_statuses = ["Active", "At Risk", "Conversion in Progress"]
        self.rankgroups = ["Positive", "Negative", "Neutral", "Introduced"]
        self.jpm_flags = ["Y", "N"]
        self.influence_levels = [1, 2, 3, 4, 5]  # 1=Low, 5=High influence
        
        # Company name prefixes by region
        self.company_prefixes = {
            "NAI": ["American", "North", "US", "Capital", "Liberty", "Eagle", "Star"],
            "EMEA": ["European", "Euro", "British", "Continental", "Royal", "Crown"],
            "APAC": ["Asia", "Pacific", "Eastern", "Dragon", "Rising", "Orient"]
        }
    
    def close(self):
        """Close database connection."""
        if self.driver:
            self.driver.close()
    
    def clear_database(self):
        """Clear all existing data."""
        print("🧹 Clearing existing database data...")
        
        with self.driver.session() as session:
            result = session.run("MATCH (n) DETACH DELETE n")
            summary = result.consume()
            print(f"✅ Cleared {summary.counters.nodes_deleted} nodes and {summary.counters.relationships_deleted} relationships")
    
    def create_constraints_and_indexes(self):
        """Create database constraints and indexes."""
        print("📋 Creating constraints and indexes...")
        
        constraints_and_indexes = [
            # Constraints
            "CREATE CONSTRAINT consultant_id_unique IF NOT EXISTS FOR (c:CONSULTANT) REQUIRE c.id IS UNIQUE",
            "CREATE CONSTRAINT field_consultant_id_unique IF NOT EXISTS FOR (fc:FIELD_CONSULTANT) REQUIRE fc.id IS UNIQUE",
            "CREATE CONSTRAINT company_id_unique IF NOT EXISTS FOR (comp:COMPANY) REQUIRE comp.id IS UNIQUE",
            "CREATE CONSTRAINT product_id_unique IF NOT EXISTS FOR (p:PRODUCT) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT incumbent_product_id_unique IF NOT EXISTS FOR (ip:INCUMBENT_PRODUCT) REQUIRE ip.id IS UNIQUE",
            
            # Indexes for performance - UPDATED: only company has region now
            "CREATE INDEX company_region_idx IF NOT EXISTS FOR (comp:COMPANY) ON (comp.region)",
            "CREATE INDEX product_asset_class_idx IF NOT EXISTS FOR (p:PRODUCT) ON (p.asset_class)",
        ]
        
        with self.driver.session() as session:
            for query in constraints_and_indexes:
                try:
                    session.run(query)
                    constraint_name = query.split()[2] if "CONSTRAINT" in query else query.split()[2]
                    print(f"  ✅ Created: {constraint_name}")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        print(f"  ⚠️ Already exists: {constraint_name}")
                    else:
                        print(f"  ❌ Failed: {e}")
    
    def generate_sample_data(self):
        """Generate sample data based on your schema."""
        print("🏭 Generating sample data...")
        
        # Configuration
        consultants_per_region = 3
        field_consultants_per_consultant = 2
        companies_per_region = 5
        products_per_company = 2
        incumbent_products_per_company = 1
        
        all_consultants = []
        all_field_consultants = []
        all_companies = []
        all_products = []
        all_incumbent_products = []
        
        # Generate data for each region
        for region in self.regions:
            print(f"  📍 Generating data for {region}...")
            
            # Create consultants (NO REGION)
            region_consultants = []
            for i in range(consultants_per_region):
                consultant_id = f"{region}_CONSULTANT_{i+1:03d}"
                consultant = {
                    "id": consultant_id,
                    "name": f"{fake.first_name()} {fake.last_name()}",
                    "pca": f"PCA_{region}_{i+1}",
                    "consultant_advisor": f"Advisor_{region}_{i+1}",
                    "sales_region": random.choice(self.sales_regions),
                    "channel": random.choice(self.channels)
                }
                region_consultants.append(consultant)
                all_consultants.append(consultant)
            
            # Create field consultants (NO REGION, HAS consultant_id)
            region_field_consultants = []
            fc_counter = 1
            for consultant in region_consultants:
                for j in range(field_consultants_per_consultant):
                    fc_id = f"{region}_FIELD_CONSULTANT_{fc_counter:03d}"
                    field_consultant = {
                        "id": fc_id,
                        "name": f"{fake.first_name()} {fake.last_name()}",
                        "consultant_id": consultant["id"],  # ✅ ADDED: consultant_id property
                        "parent_consultant_id": consultant["id"]  # Keep for relationship creation
                    }
                    region_field_consultants.append(field_consultant)
                    all_field_consultants.append(field_consultant)
                    fc_counter += 1
            
            # Create companies (HAS REGION)
            region_companies = []
            for i in range(companies_per_region):
                company_id = f"{region}_COMPANY_{i+1:03d}"
                prefix = random.choice(self.company_prefixes.get(region, ["Global"]))
                company = {
                    "id": company_id,
                    "name": f"{prefix} {fake.company().split()[0]} Corp",
                    "region": region,  # ✅ ONLY COMPANY has region
                    "pca": f"PCA_{region}_{random.randint(1, 3)}",
                    "aca": f"ACA_{region}_{random.randint(1, 3)}",
                    "sales_region": random.choice(self.sales_regions),
                    "channel": random.choice(self.channels),
                    "privacy": random.choice(self.privacy_levels)
                }
                region_companies.append(company)
                all_companies.append(company)
            
            # Create products and incumbent products for this region's companies
            for company in region_companies:
                # Regular products (NO REGION, HAS UNIVERSE)
                for i in range(products_per_company):
                    product_id = f"{region}_PRODUCT_{company['id'].split('_')[-1]}_{i+1:02d}"
                    asset_class = random.choice(self.asset_classes)
                    product = {
                        "id": product_id,
                        "name": f"{region} {asset_class} Fund {i+1}",
                        "asset_class": asset_class,
                        "jpm_flag": random.choice(self.jpm_flags),
                        "universe_name": f"{asset_class} Universe {random.randint(1, 5)}",
                        "universe_score": round(random.uniform(1.0, 10.0), 2)
                    }
                    all_products.append(product)
                
                # Incumbent products (NO REGION, NO UNIVERSE)
                for i in range(incumbent_products_per_company):
                    incumbent_id = f"{region}_INCUMBENT_{company['id'].split('_')[-1]}_{i+1:02d}"
                    incumbent_product = {
                        "id": incumbent_id,
                        "name": f"Incumbent {fake.company().split()[0]} Product {i+1}",
                        "evestment_product_guid": f"EPG_{fake.uuid4()}",
                        "jpm_flag": random.choice(self.jpm_flags)
                    }
                    all_incumbent_products.append(incumbent_product)
        
        # Insert all nodes
        self._insert_nodes("CONSULTANT", all_consultants)
        self._insert_nodes("FIELD_CONSULTANT", all_field_consultants)
        self._insert_nodes("COMPANY", all_companies)
        self._insert_nodes("PRODUCT", all_products)
        self._insert_nodes("INCUMBENT_PRODUCT", all_incumbent_products)
        
        # Create relationships
        self._create_relationships(all_consultants, all_field_consultants, all_companies, all_products, all_incumbent_products)
        
        print(f"✅ Generated {len(all_consultants)} consultants, {len(all_field_consultants)} field consultants")
        print(f"✅ Generated {len(all_companies)} companies, {len(all_products)} products, {len(all_incumbent_products)} incumbent products")
    
    def _insert_nodes(self, node_type, nodes):
        """Insert nodes of a specific type."""
        if not nodes:
            return
            
        print(f"  📊 Creating {len(nodes)} {node_type} nodes...")
        
        query = f"""
        UNWIND $nodes AS node
        CREATE (n:{node_type})
        SET n = node
        """
        
        with self.driver.session() as session:
            session.run(query, {"nodes": nodes})
    
    def _create_relationships(self, consultants, field_consultants, companies, products, incumbent_products):
        """Create all relationships."""
        print("🔗 Creating relationships...")
        
        # 1. EMPLOYS relationships (Consultant -> Field Consultant)
        employs_rels = []
        for fc in field_consultants:
            if fc.get("parent_consultant_id"):
                employs_rels.append({
                    "consultant_id": fc["parent_consultant_id"],
                    "field_consultant_id": fc["id"]
                })
        
        with self.driver.session() as session:
            session.run("""
                UNWIND $rels AS rel
                MATCH (c:CONSULTANT {id: rel.consultant_id})
                MATCH (fc:FIELD_CONSULTANT {id: rel.field_consultant_id})
                CREATE (c)-[:EMPLOYS]->(fc)
            """, {"rels": employs_rels})
        print(f"  ✅ Created {len(employs_rels)} EMPLOYS relationships")
        
        # 2. COVERS relationships (Field Consultant -> Company)
        covers_rels = []
        for fc in field_consultants:
            # Each field consultant covers 1-2 companies
            num_covers = min(2, len(companies))
            if num_covers > 0:
                covered_companies = random.sample(companies, num_covers)
                
                for company in covered_companies:
                    covers_rels.append({
                        "field_consultant_id": fc["id"],
                        "company_id": company["id"],
                        "level_of_influence": random.choice(self.influence_levels),
                    })
        
        with self.driver.session() as session:
            session.run("""
                UNWIND $rels AS rel
                MATCH (fc:FIELD_CONSULTANT {id: rel.field_consultant_id})
                MATCH (c:COMPANY {id: rel.company_id})
                CREATE (fc)-[r:COVERS]->(c)
                SET r.level_of_influence = rel.level_of_influence
            """, {"rels": covers_rels})
        print(f"  ✅ Created {len(covers_rels)} FIELD_CONSULTANT-COVERS->COMPANY relationships")
        
        # 3. Direct COVERS relationships (Consultant -> Company)
        direct_covers_rels = []
        for consultant in consultants:
            # Each consultant directly covers 1-2 companies (30% of total)
            num_direct_covers = min(2, max(1, int(len(companies) * 0.3)))
            direct_covered_companies = random.sample(companies, num_direct_covers)
            
            for company in direct_covered_companies:
                direct_covers_rels.append({
                    "consultant_id": consultant["id"],
                    "company_id": company["id"],
                    "level_of_influence": random.choice(self.influence_levels),
                })
        
        with self.driver.session() as session:
            session.run("""
                UNWIND $rels AS rel
                MATCH (c:CONSULTANT {id: rel.consultant_id})
                MATCH (comp:COMPANY {id: rel.company_id})
                CREATE (c)-[r:COVERS]->(comp)
                SET r.level_of_influence = rel.level_of_influence
            """, {"rels": direct_covers_rels})
        print(f"  ✅ Created {len(direct_covers_rels)} CONSULTANT-COVERS->COMPANY relationships")
        
        # 4. OWNS relationships (Company -> Product/Incumbent Product)
        owns_rels = []
        
        # Companies own products and incumbent products
        for company in companies:
            # Find products and incumbents that were created for this company's region
            # Since we created them in the same loop, we can match by the region prefix in ID
            company_region = company["region"]
            
            # Get products created for this company's region
            region_products = [p for p in products if p["id"].startswith(f"{company_region}_PRODUCT")]
            region_incumbents = [ip for ip in incumbent_products if ip["id"].startswith(f"{company_region}_INCUMBENT")]
            
            # Each company owns some products from their region
            owned_products = random.sample(region_products, min(2, len(region_products))) if region_products else []
            owned_incumbents = random.sample(region_incumbents, min(1, len(region_incumbents))) if region_incumbents else []
            
            for product in owned_products:
                owns_rels.append({
                    "company_id": company["id"],
                    "product_id": product["id"],
                    "product_type": "PRODUCT",
                    "mandate_status": random.choice(self.mandate_statuses)
                })
            
            for incumbent in owned_incumbents:
                owns_rels.append({
                    "company_id": company["id"],
                    "product_id": incumbent["id"],
                    "product_type": "INCUMBENT_PRODUCT",
                    "consultant": random.choice([c["id"] for c in consultants]),
                    "manager": f"Manager_{fake.last_name()}",
                    "commitment_market_value": random.randint(100000, 10000000),
                    "manager_since_date": fake.date_between(start_date='-2y', end_date='today').isoformat(),
                    "multi_mandate_manager": random.choice(["Y", "N"])
                })
        
        # Create OWNS relationships to products (only mandate_status)
        product_owns = [rel for rel in owns_rels if rel["product_type"] == "PRODUCT"]
        with self.driver.session() as session:
            session.run("""
                UNWIND $rels AS rel
                MATCH (c:COMPANY {id: rel.company_id})
                MATCH (p:PRODUCT {id: rel.product_id})
                CREATE (c)-[r:OWNS]->(p)
                SET r.mandate_status = rel.mandate_status
            """, {"rels": product_owns})
        
        # Create OWNS relationships to incumbent products (full properties)
        incumbent_owns = [rel for rel in owns_rels if rel["product_type"] == "INCUMBENT_PRODUCT"]
        with self.driver.session() as session:
            session.run("""
                UNWIND $rels AS rel
                MATCH (c:COMPANY {id: rel.company_id})
                MATCH (ip:INCUMBENT_PRODUCT {id: rel.product_id})
                CREATE (c)-[r:OWNS]->(ip)
                SET r.commitment_market_value = rel.commitment_market_value,
                    r.consultant = rel.consultant,
                    r.manager = rel.manager,
                    r.manager_since_date = rel.manager_since_date,
                    r.multi_mandate_manager = rel.multi_mandate_manager
            """, {"rels": incumbent_owns})
        print(f"  ✅ Created {len(owns_rels)} OWNS relationships")
        
        # 5. RATES relationships (Consultant -> Product)
        rates_rels = []
        for consultant in consultants:
            # Each consultant rates some products (70% probability)
            for product in products:
                if random.random() < 0.7:  # 70% chance of rating
                    rates_rels.append({
                        "consultant_id": consultant["id"],
                        "product_id": product["id"],
                        "rankgroup": random.choice(self.rankgroups),
                        "rankvalue": random.choice(["High", "Medium", "Low"]),
                        "rankorder": random.randint(1, 10),
                        "rating_change": random.choice([True, False]),
                        "level_of_influence": random.choice(self.influence_levels)
                    })
        
        with self.driver.session() as session:
            session.run("""
                UNWIND $rels AS rel
                MATCH (c:CONSULTANT {id: rel.consultant_id})
                MATCH (p:PRODUCT {id: rel.product_id})
                CREATE (c)-[r:RATES]->(p)
                SET r.rankgroup = rel.rankgroup,
                    r.rankvalue = rel.rankvalue,
                    r.rankorder = rel.rankorder,
                    r.rating_change = rel.rating_change,
                    r.level_of_influence = rel.level_of_influence
            """, {"rels": rates_rels})
        print(f"  ✅ Created {len(rates_rels)} RATES relationships")
        
        # 6. BI_RECOMMENDS relationships (Incumbent Product -> Product)
        bi_recommends_rels = []
        for incumbent in incumbent_products:
            # Each incumbent product can recommend some products (60% probability)
            for product in products:
                if random.random() < 0.6:  # 60% chance of BI recommendation
                    bi_recommends_rels.append({
                        "incumbent_id": incumbent["id"],
                        "product_id": product["id"],
                        "annualised_alpha_summary": f"Alpha: {random.randint(-5, 15)}%",
                        "batting_average_summary": f"Batting: {random.randint(40, 80)}%",
                        "downside_market_capture_summary": f"Downside: {random.randint(70, 120)}%",
                        "information_ratio_summary": f"Info Ratio: {random.uniform(0.5, 2.0):.2f}",
                        "opportunity_type": random.choice(["Growth", "Value", "Income", "Balanced"]),
                        "returns": f"{random.uniform(-10, 25):.1f}%",
                        "returns_summary": "Strong performance over 3-year period",
                        "standard_deviation_summary": f"Volatility: {random.uniform(5, 25):.1f}%",
                        "upside_market_capture_summary": f"Upside: {random.randint(80, 130)}%"
                    })
        
        with self.driver.session() as session:
            session.run("""
                UNWIND $rels AS rel
                MATCH (ip:INCUMBENT_PRODUCT {id: rel.incumbent_id})
                MATCH (p:PRODUCT {id: rel.product_id})
                CREATE (ip)-[r:BI_RECOMMENDS]->(p)
                SET r.annualised_alpha_summary = rel.annualised_alpha_summary,
                    r.batting_average_summary = rel.batting_average_summary,
                    r.downside_market_capture_summary = rel.downside_market_capture_summary,
                    r.information_ratio_summary = rel.information_ratio_summary,
                    r.opportunity_type = rel.opportunity_type,
                    r.returns = rel.returns,
                    r.returns_summary = rel.returns_summary,
                    r.standard_deviation_summary = rel.standard_deviation_summary,
                    r.upside_market_capture_summary = rel.upside_market_capture_summary
            """, {"rels": bi_recommends_rels})
        print(f"  ✅ Created {len(bi_recommends_rels)} BI_RECOMMENDS relationships")
    
    def verify_setup(self):
        """Verify the database setup."""
        print("🔍 Verifying database setup...")
        
        verification_queries = {
            "Consultants": "MATCH (c:CONSULTANT) RETURN count(c) as count",
            "Field Consultants": "MATCH (fc:FIELD_CONSULTANT) RETURN count(fc) as count",
            "Companies": "MATCH (comp:COMPANY) RETURN count(comp) as count",
            "Products": "MATCH (p:PRODUCT) RETURN count(p) as count",
            "Incumbent Products": "MATCH (ip:INCUMBENT_PRODUCT) RETURN count(ip) as count",
            "EMPLOYS": "MATCH ()-[r:EMPLOYS]->() RETURN count(r) as count",
            "COVERS (FC->Company)": "MATCH (:FIELD_CONSULTANT)-[r:COVERS]->(:COMPANY) RETURN count(r) as count",
            "COVERS (Consultant->Company)": "MATCH (:CONSULTANT)-[r:COVERS]->(:COMPANY) RETURN count(r) as count",
            "OWNS": "MATCH ()-[r:OWNS]->() RETURN count(r) as count",
            "RATES": "MATCH ()-[r:RATES]->() RETURN count(r) as count",
            "BI_RECOMMENDS": "MATCH ()-[r:BI_RECOMMENDS]->() RETURN count(r) as count"
        }
        
        with self.driver.session() as session:
            for name, query in verification_queries.items():
                result = session.run(query)
                count = result.single()["count"]
                print(f"  📊 {name}: {count}")
        
        # Check sample data and property names
        print("\n🔍 Sample data verification:")
        with self.driver.session() as session:
            # Sample consultant (no region)
            result = session.run("MATCH (c:CONSULTANT) RETURN c.name, c.pca LIMIT 1")
            if result.peek():
                record = result.single()
                print(f"  👤 Sample Consultant: {record['c.name']} (PCA: {record['c.pca']})")
            
            # Sample field consultant (has consultant_id)
            result = session.run("MATCH (fc:FIELD_CONSULTANT) RETURN fc.name, fc.consultant_id LIMIT 1")
            if result.peek():
                record = result.single()
                print(f"  👥 Sample Field Consultant: {record['fc.name']} (Consultant ID: {record['fc.consultant_id']})")
            
            # Sample company (has region)
            result = session.run("MATCH (comp:COMPANY) RETURN comp.name, comp.region LIMIT 1")
            if result.peek():
                record = result.single()
                print(f"  🏢 Sample Company: {record['comp.name']} (Region: {record['comp.region']})")
            
            # Sample product (has universe properties)
            result = session.run("MATCH (p:PRODUCT) RETURN p.name, p.universe_name, p.universe_score LIMIT 1")
            if result.peek():
                record = result.single()
                print(f"  📦 Sample Product: {record['p.name']} (Universe: {record['p.universe_name']}, Score: {record['p.universe_score']})")
            
            # Sample incumbent product (no universe properties)
            result = session.run("MATCH (ip:INCUMBENT_PRODUCT) RETURN ip.name, ip.evestment_product_guid LIMIT 1")
            if result.peek():
                record = result.single()
                print(f"  🔄 Sample Incumbent Product: {record['ip.name']} (GUID: {record['ip.evestment_product_guid'][:20]}...)")
            
            # Sample COVERS relationship
            result = session.run("MATCH (c:CONSULTANT)-[r:COVERS]->(comp:COMPANY) RETURN c.name, r.level_of_influence, comp.name LIMIT 1")
            if result.peek():
                record = result.single()
                print(f"  🔗 Sample CONSULTANT-COVERS: {record['c.name']} covers {record['comp.name']} (Influence: {record['r.level_of_influence']})")
            
            # Sample BI_RECOMMENDS relationship
            result = session.run("MATCH (ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT) RETURN ip.name, r.opportunity_type, r.returns, p.name LIMIT 1")
            if result.peek():
                record = result.single()
                print(f"  🔗 Sample BI_RECOMMENDS: {record['ip.name']} recommends {record['p.name']} (Type: {record['r.opportunity_type']}, Returns: {record['r.returns']})")


def main():
    """Main setup function."""
    print("=" * 70)
    print("🎯 Smart Network Neo4j Database Complete Setup")
    print("=" * 70)
    print(f"🔗 Connecting to: {NEO4J_URI}")
    print(f"👤 Username: {NEO4J_USERNAME}")
    print("🗃️ This will create nodes, relationships, and sample data")
    print("✅ CORRECTED: Region only on COMPANY, universe only on PRODUCT")
    print("🔧 Using BI_RECOMMENDS and level_of_influence properties")
    print("🆕 UPDATED: Added consultant_id to FIELD_CONSULTANT nodes")
    print()
    
    # Confirm before proceeding
    response = input("⚠️  This will CLEAR ALL existing data. Continue? (y/N): ")
    if response.lower() != 'y':
        print("❌ Setup cancelled")
        return
    
    setup = SmartNetworkSetup()
    
    try:
        # Step 1: Clear existing data
        setup.clear_database()
        
        # Step 2: Create constraints and indexes
        setup.create_constraints_and_indexes()
        
        # Step 3: Generate sample data
        setup.generate_sample_data()
        
        # Step 4: Verify setup
        setup.verify_setup()
        
        print("\n" + "=" * 70)
        print("🎉 Database setup completed successfully!")
        print("🌐 You can now:")
        print("   1. View data in Neo4j Browser: http://localhost:7474")
        print("   2. Test INCUMBENT_PRODUCT-BI_RECOMMENDS->PRODUCT: MATCH (ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT) RETURN ip, r, p")
        print("   3. Test company regions: MATCH (c:COMPANY) RETURN c.name, c.region")
        print("   4. Test product universe: MATCH (p:PRODUCT) RETURN p.name, p.universe_name, p.universe_score")
        print("   5. Test field consultant_id: MATCH (fc:FIELD_CONSULTANT) RETURN fc.name, fc.consultant_id")
        print("   6. Start the FastAPI backend: python -m app.main")
        print("   7. Access API docs: http://localhost:8000/docs")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure Neo4j is running: brew services start neo4j")
        print("   2. Check your password in the script")
        print("   3. Verify Neo4j is accessible: http://localhost:7474")
    finally:
        setup.close()


if __name__ == "__main__":
    main()