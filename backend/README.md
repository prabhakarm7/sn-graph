Smart Network Backend API
A scalable FastAPI backend for the Smart Network Graph Application with Neo4j database integration.

🏗️ Architecture
FastAPI: Modern, async Python web framework
Neo4j: Graph database for network data
Pydantic: Data validation and serialization
Docker: Containerized development and deployment
Redis: Optional caching layer
📋 Prerequisites
Python 3.11+
Neo4j 5.15+ (installed on Mac)
Docker & Docker Compose (for containerized setup)
Git
🚀 Quick Start
Option 1: Local Development with Existing Neo4j
Clone and setup the project:
bash
git clone <repository-url>
cd smart-network-backend
python -m venv venv
source venv/bin/activate  # On Mac/Linux
pip install -r requirements.txt
Configure environment:
bash
cp .env.example .env
# Edit .env with your Neo4j credentials
Setup database:
bash
python scripts/setup_database.py
Run the application:
bash
python -m app.main
# Or with uvicorn directly:
uvicorn app.main:app --reload --host localhost --port 8000
Option 2: Docker Compose (Includes Neo4j)
Start all services:
bash
docker-compose up -d
Setup database:
bash
docker-compose exec backend python scripts/setup_database.py
Access services:
API: http://localhost:8000
Neo4j Browser: http://localhost:7474
API Docs: http://localhost:8000/docs
📊 Database Schema
Node Types
CONSULTANT: Senior consultants with performance metrics
FIELD_CONSULTANT: Field consultants linked to senior consultants
COMPANY: Client companies with mandate information
PRODUCT: Investment products with ratings
Relationship Types
EMPLOYS: Consultant → Field Consultant
COVERS: Field Consultant → Company (with influence level 1-4)
OWNS: Company → Product (with mandate status: Active/At Risk/Conversion in Progress)
RATES: Consultant → Product (with rating: Positive/Negative/Introduced/Neutral)
Sample Cypher Queries
cypher
// Get all consultants in NAI region
MATCH (c:CONSULTANT {region: 'NAI'}) RETURN c

// Find high-influence coverage relationships
MATCH (fc:FIELD_CONSULTANT)-[r:COVERS {level_of_influence: 4}]->(comp:COMPANY)
RETURN fc, r, comp

// Get products with positive ratings
MATCH (c:CONSULTANT)-[r:RATES {rating: 'Positive'}]->(p:PRODUCT)
RETURN c.name, p.name, p.asset_class

// Find at-risk mandates
MATCH (comp:COMPANY)-[r:OWNS {mandate_status: 'At Risk'}]->(p:PRODUCT)
RETURN comp.name, p.name, r.value
🔌 API Endpoints
Core Endpoints
Graph Operations
GET /api/v1/graph/region/{region} - Get all data for a region
POST /api/v1/graph/filter - Apply filters to get specific data
GET /api/v1/graph/stats - Database statistics
POST /api/v1/graph/generate - Generate sample dataset
DELETE /api/v1/graph/clear - Clear all data ⚠️
Filters & Search
GET /api/v1/filters/options - Available filter options
GET /api/v1/filters/options/{region} - Region-specific filter options
Utilities
GET /health - Health check
POST /api/v1/graph/query - Execute custom Cypher queries
Example API Usage
bash
# Get NAI region data
curl "http://localhost:8000/api/v1/graph/region/NAI"

# Apply filters
curl -X POST "http://localhost:8000/api/v1/graph/filter" \
  -H "Content-Type: application/json" \
  -d '{
    "regions": ["NAI"],
    "node_types": ["CONSULTANT", "PRODUCT"],
    "mandate_statuses": ["Active"],
    "ratings": ["Positive"]
  }'

# Generate sample data
curl -X POST "http://localhost:8000/api/v1/graph/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "regions": ["NAI"],
    "consultants_per_region": 5,
    "field_consultants_per_consultant": 2,
    "companies_per_field_consultant": 3,
    "products_per_company": 2
  }'
🔧 Configuration
Environment Variables
bash
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j

# API Configuration
API_HOST=localhost
API_PORT=8000
DEBUG=True
ENVIRONMENT=development

# Data Generation Limits
MAX_CONSULTANTS_PER_REGION=50
MAX_FIELD_CONSULTANTS_PER_CONSULTANT=5
MAX_COMPANIES_PER_FIELD=10
MAX_PRODUCTS_PER_COMPANY=8
Scaling Configuration
For production use, adjust these settings in your .env:

bash
# Production settings
DEBUG=False
ENVIRONMENT=production
LOG_LEVEL=INFO

# Database connection pooling
NEO4J_MAX_CONNECTION_POOL_SIZE=100
NEO4J_CONNECTION_ACQUISITION_TIMEOUT=60

# Larger dataset limits
DEFAULT_REGION_SIZE=10000
MAX_CONSULTANTS_PER_REGION=200
📈 Data Generation
The system can generate large, realistic datasets:

Sample Data Sizes
Consultants/Region	Total Nodes	Total Relationships	Estimated Memory
10	~720	~1,440	~10MB
50	~3,600	~7,200	~50MB
100	~7,200	~14,400	~100MB
200	~14,400	~28,800	~200MB
Generation Script
bash
# Generate large dataset
python scripts/generate_data.py --regions NAI EMEA APAC --consultants 50

# Generate specific region
python scripts/generate_data.py --regions NAI --consultants 100 --products-per-company 5
🧪 Testing
bash
# Run tests
pytest

# Run with coverage
pytest --cov=app

# Load testing
locust -f tests/load_test.py --host=http://localhost:8000
📦 Deployment
Docker Production
bash
# Build production image
docker build -t smart-network-backend:latest .

# Run with production settings
docker run -d \
  --name smart-network-backend \
  -p 8000:8000 \
  -e NEO4J_URI=bolt://your-neo4j-host:7687 \
  -e NEO4J_PASSWORD=your-production-password \
  -e ENVIRONMENT=production \
  smart-network-backend:latest
Performance Optimization
Database Indexes: Automatically created during setup
Connection Pooling: Configured for high concurrency
Async Operations: All database operations are async
Caching: Redis integration for frequently accessed data
Batch Operations: Bulk data creation and updates
🔍 Monitoring
Health Checks
API Health: GET /health
Database Health: Included in health endpoint
Docker Health: Built-in container health checks
Logging
Console Logging: Colored output for development
File Logging: Structured logs with rotation
Error Logging: Separate error log file
Request Logging: FastAPI access logs
Metrics
Key metrics to monitor:

Response times
Database connection pool usage
Memory usage
Query execution times
Node/relationship counts
🚨 Troubleshooting
Common Issues
Neo4j Connection Failed
bash
# Check Neo4j status
brew services list | grep neo4j

# Start Neo4j
brew services start neo4j

# Check logs
tail -f /usr/local/var/log/neo4j/neo4j.log
Permission Errors
bash
# Fix log directory permissions
mkdir -p logs
chmod 755 logs
Port Already in Use
bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
Large Dataset Performance
Increase Neo4j memory settings
Use batch operations for bulk imports
Monitor query execution times
📚 API Documentation
Interactive Docs: http://localhost:8000/docs (Swagger UI)
Alternative Docs: http://localhost:8000/redoc (ReDoc)
OpenAPI Schema: http://localhost:8000/openapi.json
🤝 Contributing
Fork the repository
Create a feature branch
Make changes with tests
Run linting and tests
Submit a pull request
📄 License
MIT License - see LICENSE file for details.

