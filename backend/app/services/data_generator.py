"""
Large-scale data generation service for Smart Network Backend.
"""
import random
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from faker import Faker

from loguru import logger

from app.config import settings, REGIONS, SALES_REGIONS, CHANNELS, ASSET_CLASSES
from app.config import PRIVACY_LEVELS, MANDATE_STATUSES, RATING_VALUES, INFLUENCE_LEVELS
from app.config import MANDATE_STATUS_WEIGHTS, RATING_WEIGHTS
from app.database.connection import Neo4jConnection
from app.database.models import DataGenerationConfig, DataGenerationResponse, RegionStats


class SmartNetworkDataGenerator:
    """Generates realistic large-scale network data for the Smart Network application."""
    
    def __init__(self, connection: Neo4jConnection):
        self.connection = connection
        self.fake = Faker()
        Faker.seed(42)  # For reproducible data
        random.seed(42)
        
        # Company names for different regions
        self.company_prefixes = {
            "NAI": ["American", "North", "US", "Capital", "Liberty", "Eagle", "Star"],
            "EMEA": ["European", "Euro", "British", "Continental", "Royal", "Crown"],
            "APAC": ["Asia", "Pacific", "Eastern", "Dragon", "Rising", "Orient"]
        }
        
        # Product names by asset class
        self.product_names = {
            "Equities": ["Growth Fund", "Value Fund", "Index Fund", "Small Cap Fund", "Large Cap Fund"],
            "Fixed Income": ["Bond Fund", "Treasury Fund", "Credit Fund", "Municipal Bond", "High Yield"],
            "Real Estate": ["REIT Fund", "Property Fund", "Real Estate Index", "Commercial RE"],
            "Commodities": ["Gold Fund", "Energy Fund", "Commodity Index", "Natural Resources"],
            "Alternatives": ["Hedge Fund", "Private Equity", "Infrastructure", "Absolute Return"],
            "Multi-Asset": ["Balanced Fund", "Target Date", "Multi-Strategy", "Global Allocation"]
        }
    
    async def generate_large_dataset(self, config: DataGenerationConfig) -> DataGenerationResponse:
        """Generate a large, realistic dataset based on configuration."""
        start_time = time.time()
        logger.info(f"🏭 Starting large dataset generation: {config.dict()}")
        
        try:
            # Clear existing data first
            await self._clear_database()
            
            created_counts = {}
            region_stats = []
            
            # Generate data for each region
            for region in config.regions:
                logger.info(f"🌍 Generating data for region: {region}")
                
                region_counts = await self._generate_region_data(region, config)
                
                # Update total counts
                for key, value in region_counts.items():
                    created_counts[key] = created_counts.get(key, 0) + value
                
                # Get region statistics
                stats = await self._get_region_statistics(region)
                region_stats.append(stats)
                
                logger.success(f"✅ Completed region {region}: {region_counts}")
            
            execution_time = time.time() - start_time
            
            logger.success(f"🎉 Dataset generation completed in {execution_time:.2f}s")
            logger.info(f"📊 Total created: {created_counts}")
            
            return DataGenerationResponse(
                success=True,
                message="Large dataset generated successfully",
                generation_config=config,
                created_counts=created_counts,
                execution_time=execution_time,
                region_stats=region_stats
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"❌ Dataset generation failed after {execution_time:.2f}s: {e}")
            raise
    
    async def _clear_database(self) -> None:
        """Clear all existing data from the database."""
        logger.info("🧹 Clearing existing database data")
        
        clear_query = """
        MATCH (n)
        DETACH DELETE n
        """
        
        result = await self.connection.execute_write_query(clear_query)
        logger.info(f"🗑️ Cleared {result.get('nodes_deleted', 0)} nodes and relationships")
    
    async def _generate_region_data(self, region: str, config: DataGenerationConfig) -> Dict[str, int]:
        """Generate data for a specific region."""
        created_counts = {
            "consultants": 0,
            "field_consultants": 0,
            "companies": 0,
            "products": 0,
            "employs_relationships": 0,
            "covers_relationships": 0,
            "owns_relationships": 0,
            "rates_relationships": 0
        }
        
        # Step 1: Generate consultants
        consultant_ids = await self._create_consultants(region, config.consultants_per_region)
        created_counts["consultants"] = len(consultant_ids)
        
        # Step 2: Generate field consultants
        field_consultant_data = await self._create_field_consultants(
            region, consultant_ids, config.field_consultants_per_consultant
        )
        field_consultant_ids = [fc["id"] for fc in field_consultant_data]
        created_counts["field_consultants"] = len(field_consultant_ids)
        
        # Step 3: Create EMPLOYS relationships
        employs_count = await self._create_employs_relationships(field_consultant_data)
        created_counts["employs_relationships"] = employs_count
        
        # Step 4: Generate companies
        company_ids = await self._create_companies(
            region, field_consultant_ids, config.companies_per_field_consultant
        )
        created_counts["companies"] = len(company_ids)
        
        # Step 5: Create COVERS relationships
        covers_count = await self._create_covers_relationships(
            field_consultant_ids, company_ids, config.cross_coverage_probability
        )
        created_counts["covers_relationships"] = covers_count
        
        # Step 6: Generate products
        product_ids = await self._create_products(
            region, company_ids, config.products_per_company
        )
        created_counts["products"] = len(product_ids)
        
        # Step 7: Create OWNS relationships
        owns_count = await self._create_owns_relationships(company_ids, product_ids)
        created_counts["owns_relationships"] = owns_count
        
        # Step 8: Create RATES relationships
        rates_count = await self._create_rates_relationships(
            consultant_ids, product_ids, config.rating_probability
        )
        created_counts["rates_relationships"] = rates_count
        
        return created_counts
    
    async def _create_consultants(self, region: str, count: int) -> List[str]:
        """Create consultant nodes."""
        logger.info(f"👔 Creating {count} consultants for {region}")
        
        consultant_data = []
        for i in range(count):
            consultant_id = f"{region}_C{i+1:03d}"
            
            consultant_data.append({
                "id": consultant_id,
                "name": f"{self.fake.first_name()} {self.fake.last_name()}",
                "region": region,
                "sales_region": random.choice(SALES_REGIONS),
                "channel": random.choice(CHANNELS),
                "pca": f"PCA_{region}_{i+1:03d}",
                "performance": random.randint(60, 100),
                "influence": random.randint(70, 100)
            })
        
        # Bulk create consultants
        query = """
        UNWIND $consultants AS consultant
        CREATE (c:CONSULTANT)
        SET c = consultant
        """
        
        await self.connection.execute_write_query(query, {"consultants": consultant_data})
        
        return [c["id"] for c in consultant_data]
    
    async def _create_field_consultants(
        self, region: str, consultant_ids: List[str], per_consultant: int
    ) -> List[Dict[str, Any]]:
        """Create field consultant nodes."""
        total_count = len(consultant_ids) * per_consultant
        logger.info(f"👨‍💼 Creating {total_count} field consultants for {region}")
        
        field_consultant_data = []
        fc_counter = 1
        
        for consultant_id in consultant_ids:
            for j in range(per_consultant):
                fc_id = f"{region}_FC{fc_counter:03d}"
                
                field_consultant_data.append({
                    "id": fc_id,
                    "name": f"{self.fake.first_name()} {self.fake.last_name()}",
                    "region": region,
                    "parent_consultant_id": consultant_id,
                    "sales_region": random.choice(SALES_REGIONS),
                    "channel": random.choice(CHANNELS[:2])  # Limited channels for field consultants
                })
                
                fc_counter += 1
        
        # Bulk create field consultants
        query = """
        UNWIND $field_consultants AS fc
        CREATE (f:FIELD_CONSULTANT)
        SET f = fc
        """
        
        await self.connection.execute_write_query(query, {"field_consultants": field_consultant_data})
        
        return field_consultant_data
    
    async def _create_employs_relationships(self, field_consultant_data: List[Dict[str, Any]]) -> int:
        """Create EMPLOYS relationships between consultants and field consultants."""
        logger.info("🔗 Creating EMPLOYS relationships")
        
        employs_data = []
        for fc in field_consultant_data:
            employs_data.append({
                "consultant_id": fc["parent_consultant_id"],
                "field_consultant_id": fc["id"],
                "start_date": self.fake.date_between(start_date='-2y', end_date='today').isoformat(),
                "duration": random.choice(["1 year", "2 years", "3+ years", "6 months"])
            })
        
        query = """
        UNWIND $employs AS emp
        MATCH (c:CONSULTANT {id: emp.consultant_id})
        MATCH (fc:FIELD_CONSULTANT {id: emp.field_consultant_id})
        CREATE (c)-[r:EMPLOYS]->(fc)
        SET r.start_date = emp.start_date,
            r.duration = emp.duration
        """
        
        await self.connection.execute_write_query(query, {"employs": employs_data})
        
        return len(employs_data)
    
    async def _create_companies(
        self, region: str, field_consultant_ids: List[str], per_field_consultant: int
    ) -> List[str]:
        """Create company nodes."""
        total_count = len(field_consultant_ids) * per_field_consultant
        logger.info(f"🏢 Creating {total_count} companies for {region}")
        
        company_data = []
        company_counter = 1
        
        prefixes = self.company_prefixes.get(region, ["Global", "International"])
        
        for _ in range(total_count):
            company_id = f"{region}_COMP{company_counter:03d}"
            
            prefix = random.choice(prefixes)
            suffix = random.choice(["Corp", "LLC", "Inc", "Group", "Holdings", "Partners"])
            
            company_data.append({
                "id": company_id,
                "name": f"{prefix} {self.fake.company().split()[0]} {suffix}",
                "region": region,
                "sales_region": random.choice(SALES_REGIONS),
                "channel": random.choice(CHANNELS),
                "privacy": random.choice(PRIVACY_LEVELS),
                "aca": f"ACA_{region}_{random.randint(1, 10):02d}"
            })
            
            company_counter += 1
        
        # Bulk create companies
        query = """
        UNWIND $companies AS company
        CREATE (c:COMPANY)
        SET c = company
        """
        
        await self.connection.execute_write_query(query, {"companies": company_data})
        
        return [c["id"] for c in company_data]
    
    async def _create_covers_relationships(
        self, field_consultant_ids: List[str], company_ids: List[str], cross_coverage_prob: float
    ) -> int:
        """Create COVERS relationships between field consultants and companies."""
        logger.info("🔗 Creating COVERS relationships")
        
        covers_data = []
        
        # Primary coverage: each company gets one primary field consultant
        random.shuffle(company_ids)
        companies_per_fc = len(company_ids) // len(field_consultant_ids)
        
        for i, fc_id in enumerate(field_consultant_ids):
            start_idx = i * companies_per_fc
            end_idx = start_idx + companies_per_fc if i < len(field_consultant_ids) - 1 else len(company_ids)
            
            for company_id in company_ids[start_idx:end_idx]:
                covers_data.append({
                    "field_consultant_id": fc_id,
                    "company_id": company_id,
                    "level_of_influence": random.choices(
                        INFLUENCE_LEVELS, 
                        weights=[0.1, 0.3, 0.4, 0.2]  # Weighted towards higher influence
                    )[0],
                    "coverage_type": "Primary"
                })
        
        # Cross coverage: additional relationships based on probability
        for fc_id in field_consultant_ids:
            for company_id in company_ids:
                if random.random() < cross_coverage_prob:
                    # Check if relationship already exists
                    existing = any(
                        r["field_consultant_id"] == fc_id and r["company_id"] == company_id 
                        for r in covers_data
                    )
                    
                    if not existing:
                        covers_data.append({
                            "field_consultant_id": fc_id,
                            "company_id": company_id,
                            "level_of_influence": random.choices(
                                INFLUENCE_LEVELS, 
                                weights=[0.3, 0.4, 0.2, 0.1]  # Lower influence for cross coverage
                            )[0],
                            "coverage_type": "Secondary"
                        })
        
        query = """
        UNWIND $covers AS cov
        MATCH (fc:FIELD_CONSULTANT {id: cov.field_consultant_id})
        MATCH (c:COMPANY {id: cov.company_id})
        CREATE (fc)-[r:COVERS]->(c)
        SET r.level_of_influence = cov.level_of_influence,
            r.coverage_type = cov.coverage_type
        """
        
        await self.connection.execute_write_query(query, {"covers": covers_data})
        
        return len(covers_data)
    
    async def _create_products(
        self, region: str, company_ids: List[str], per_company: int
    ) -> List[str]:
        """Create product nodes."""
        total_count = len(company_ids) * per_company
        logger.info(f"📈 Creating {total_count} products for {region}")
        
        product_data = []
        product_counter = 1
        
        for _ in range(total_count):
            product_id = f"{region}_PROD{product_counter:03d}"
            asset_class = random.choice(ASSET_CLASSES)
            product_name_base = random.choice(self.product_names[asset_class])
            
            product_data.append({
                "id": product_id,
                "name": f"{region} {product_name_base} {product_counter}",
                "region": region,
                "asset_class": asset_class,
                "product_label": f"{region}_{asset_class.replace(' ', '_').upper()}_{product_counter:03d}"
            })
            
            product_counter += 1
        
        # Bulk create products
        query = """
        UNWIND $products AS product
        CREATE (p:PRODUCT)
        SET p = product
        """
        
        await self.connection.execute_write_query(query, {"products": product_data})
        
        return [p["id"] for p in product_data]
    
    async def _create_owns_relationships(self, company_ids: List[str], product_ids: List[str]) -> int:
        """Create OWNS relationships between companies and products."""
        logger.info("🔗 Creating OWNS relationships")
        
        owns_data = []
        
        # Distribute products among companies
        products_per_company = len(product_ids) // len(company_ids)
        
        for i, company_id in enumerate(company_ids):
            start_idx = i * products_per_company
            end_idx = start_idx + products_per_company if i < len(company_ids) - 1 else len(product_ids)
            
            for product_id in product_ids[start_idx:end_idx]:
                mandate_status = random.choices(
                    list(MANDATE_STATUS_WEIGHTS.keys()),
                    weights=list(MANDATE_STATUS_WEIGHTS.values())
                )[0]
                
                owns_data.append({
                    "company_id": company_id,
                    "product_id": product_id,
                    "mandate_status": mandate_status,
                    "value": random.randint(100000, 10000000),  # $100K to $10M
                    "start_date": self.fake.date_between(start_date='-1y', end_date='today').isoformat()
                })
        
        query = """
        UNWIND $owns AS own
        MATCH (c:COMPANY {id: own.company_id})
        MATCH (p:PRODUCT {id: own.product_id})
        CREATE (c)-[r:OWNS]->(p)
        SET r.mandate_status = own.mandate_status,
            r.value = own.value,
            r.start_date = own.start_date
        """
        
        await self.connection.execute_write_query(query, {"owns": owns_data})
        
        return len(owns_data)
    
    async def _create_rates_relationships(
        self, consultant_ids: List[str], product_ids: List[str], rating_probability: float
    ) -> int:
        """Create RATES relationships between consultants and products."""
        logger.info("🔗 Creating RATES relationships")
        
        rates_data = []
        
        for consultant_id in consultant_ids:
            for product_id in product_ids:
                if random.random() < rating_probability:
                    rating = random.choices(
                        list(RATING_WEIGHTS.keys()),
                        weights=list(RATING_WEIGHTS.values())
                    )[0]
                    
                    rates_data.append({
                        "consultant_id": consultant_id,
                        "product_id": product_id,
                        "rating": rating,
                        "date": self.fake.date_between(start_date='-6m', end_date='today').isoformat(),
                        "notes": self.fake.sentence() if random.random() < 0.3 else None
                    })
        
        query = """
        UNWIND $rates AS rate
        MATCH (c:CONSULTANT {id: rate.consultant_id})
        MATCH (p:PRODUCT {id: rate.product_id})
        CREATE (c)-[r:RATES]->(p)
        SET r.rating = rate.rating,
            r.date = rate.date,
            r.notes = rate.notes
        """
        
        await self.connection.execute_write_query(query, {"rates": rates_data})
        
        return len(rates_data)
    
    async def _get_region_statistics(self, region: str) -> RegionStats:
        """Get statistics for a specific region."""
        stats_query = """
        MATCH (n {region: $region})
        WITH labels(n)[0] as node_type, count(n) as count
        RETURN node_type, count
        UNION ALL
        MATCH (n {region: $region})-[r]->()
        WITH type(r) as rel_type, count(r) as count
        RETURN rel_type as node_type, count
        """
        
        results = await self.connection.execute_query(stats_query, {"region": region})
        
        node_counts = {}
        rel_counts = {}
        
        for record in results:
            node_type = record["node_type"]
            count = record["count"]
            
            if node_type in ["CONSULTANT", "FIELD_CONSULTANT", "COMPANY", "PRODUCT"]:
                node_counts[node_type] = count
            else:
                rel_counts[node_type] = count
        
        return RegionStats(
            region=region,
            consultant_count=node_counts.get("CONSULTANT", 0),
            field_consultant_count=node_counts.get("FIELD_CONSULTANT", 0),
            company_count=node_counts.get("COMPANY", 0),
            product_count=node_counts.get("PRODUCT", 0),
            relationship_counts=rel_counts
        )