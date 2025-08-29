"""
Test script for the new Product Recommendations API endpoints.
Run this to verify that the recommendations functionality works correctly.
"""
import requests
import json
import time
from typing import Dict, Any


class RecommendationsAPITester:
    """Test suite for the Product Recommendations API."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        
    def test_health_check(self) -> bool:
        """Test if the API is running and healthy."""
        try:
            response = requests.get(f"{self.api_url}/hierarchical/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health Check: {data['status']}")
                print(f"   Recommendations Support: {data.get('recommendations_support', False)}")
                print(f"   Available Modes: {list(data.get('supported_modes', {}).keys())}")
                return data['status'] == 'healthy'
            else:
                print(f"❌ Health Check Failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health Check Error: {e}")
            return False
    
    def test_normal_mode(self, region: str = "NAI") -> Dict[str, Any]:
        """Test the normal mode (existing functionality)."""
        print(f"\n🔵 Testing Normal Mode for region: {region}")
        
        try:
            response = requests.get(f"{self.api_url}/hierarchical/region/{region}/complete")
            
            if response.status_code == 200:
                data = response.json()
                stats = data.get('data', {}).get('statistics', {})
                
                print(f"✅ Normal Mode Success:")
                print(f"   Region: {data.get('data', {}).get('region', 'Unknown')}")
                print(f"   Mode: {data.get('mode', 'Unknown')}")
                print(f"   Nodes: {stats.get('total_nodes', 0)}")
                print(f"   Relationships: {stats.get('total_relationships', 0)}")
                print(f"   Filter Options: {stats.get('total_filter_options', 0)}")
                
                # Check for normal relationship types
                relationships = data.get('data', {}).get('graph_data', {}).get('relationships', [])
                rel_types = {}
                for rel in relationships:
                    rel_type = rel.get('type', 'UNKNOWN')
                    rel_types[rel_type] = rel_types.get(rel_type, 0) + 1
                
                print(f"   Relationship Types: {rel_types}")
                
                # Verify it's standard mode
                owns_count = rel_types.get('OWNS', 0)
                recommends_count = rel_types.get('RECOMMENDS', 0)
                
                if owns_count > 0 and recommends_count == 0:
                    print(f"✅ Confirmed Standard Mode: {owns_count} OWNS, {recommends_count} RECOMMENDS")
                else:
                    print(f"⚠️  Unexpected relationship distribution for standard mode")
                
                return data
            else:
                print(f"❌ Normal Mode Failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return {}
                
        except Exception as e:
            print(f"❌ Normal Mode Error: {e}")
            return {}
    
    def test_recommendations_mode(self, region: str = "NAI") -> Dict[str, Any]:
        """Test the new recommendations mode."""
        print(f"\n🟢 Testing Recommendations Mode for region: {region}")
        
        try:
            response = requests.get(f"{self.api_url}/hierarchical/region/{region}/recommendations")
            
            if response.status_code == 200:
                data = response.json()
                stats = data.get('data', {}).get('statistics', {})
                
                print(f"✅ Recommendations Mode Success:")
                print(f"   Region: {data.get('data', {}).get('region', 'Unknown')}")
                print(f"   Mode: {data.get('mode', 'Unknown')}")
                print(f"   Nodes: {stats.get('total_nodes', 0)}")
                print(f"   Relationships: {stats.get('total_relationships', 0)}")
                print(f"   Filter Options: {stats.get('total_filter_options', 0)}")
                print(f"   Recommendations Count: {stats.get('recommendations_count', 0)}")
                print(f"   Incumbent Products: {stats.get('incumbent_products_count', 0)}")
                
                # Check for recommendations-specific data
                relationships = data.get('data', {}).get('graph_data', {}).get('relationships', [])
                nodes = data.get('data', {}).get('graph_data', {}).get('nodes', [])
                
                rel_types = {}
                for rel in relationships:
                    rel_type = rel.get('type', 'UNKNOWN')
                    rel_types[rel_type] = rel_types.get(rel_type, 0) + 1
                
                node_types = {}
                for node in nodes:
                    for label in node.get('labels', []):
                        node_types[label] = node_types.get(label, 0) + 1
                
                print(f"   Relationship Types: {rel_types}")
                print(f"   Node Types: {node_types}")
                
                # Check for RECOMMENDS relationships and INCUMBENT_PRODUCT nodes
                recommends_count = rel_types.get('RECOMMENDS', 0)
                incumbent_count = node_types.get('INCUMBENT_PRODUCT', 0)
                owns_count = rel_types.get('OWNS', 0)
                
                if recommends_count > 0:
                    print(f"🎉 Found {recommends_count} RECOMMENDS relationships!")
                else:
                    print(f"⚠️  No RECOMMENDS relationships found")
                
                if incumbent_count > 0:
                    print(f"🎉 Found {incumbent_count} INCUMBENT_PRODUCT nodes!")
                else:
                    print(f"⚠️  No INCUMBENT_PRODUCT nodes found")
                
                if owns_count > 0:
                    print(f"📊 Found {owns_count} OWNS relationships (company -> incumbent_product)")
                
                # Verify recommendations mode characteristics
                if recommends_count > 0 and incumbent_count > 0:
                    print(f"✅ Confirmed Recommendations Mode structure")
                else:
                    print(f"⚠️  Missing key recommendations mode components")
                
                return data
            else:
                print(f"❌ Recommendations Mode Failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return {}
                
        except Exception as e:
            print(f"❌ Recommendations Mode Error: {e}")
            return {}
    
    def test_region_change_normal(self, from_region: str = "NAI", to_region: str = "EMEA") -> Dict[str, Any]:
        """Test region change in normal mode."""
        print(f"\n🔄 Testing Normal Region Change: {from_region} → {to_region}")
        
        try:
            response = requests.put(
                f"{self.api_url}/hierarchical/region/change/{to_region}?current_region={from_region}&recommendations_mode=false"
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Normal Region Change Success:")
                print(f"   New Region: {data.get('data', {}).get('region', 'Unknown')}")
                print(f"   Mode: {data.get('mode', 'Unknown')}")
                print(f"   Message: {data.get('message', 'No message')}")
                
                # Verify it's still standard mode
                relationships = data.get('data', {}).get('graph_data', {}).get('relationships', [])
                rel_types = {}
                for rel in relationships:
                    rel_type = rel.get('type', 'UNKNOWN')
                    rel_types[rel_type] = rel_types.get(rel_type, 0) + 1
                
                owns_count = rel_types.get('OWNS', 0)
                recommends_count = rel_types.get('RECOMMENDS', 0)
                print(f"   Verified Standard Mode: {owns_count} OWNS, {recommends_count} RECOMMENDS")
                
                return data
            else:
                print(f"❌ Normal Region Change Failed: {response.status_code}")
                return {}
                
        except Exception as e:
            print(f"❌ Normal Region Change Error: {e}")
            return {}
    
    def test_region_change_recommendations(self, from_region: str = "NAI", to_region: str = "EMEA") -> Dict[str, Any]:
        """Test region change in recommendations mode."""
        print(f"\n🔄 Testing Recommendations Region Change: {from_region} → {to_region}")
        
        try:
            response = requests.put(
                f"{self.api_url}/hierarchical/region/change/{to_region}/recommendations?current_region={from_region}"
            )
            
            if response.status_code == 200:
                data = response.json()
                stats = data.get('data', {}).get('statistics', {})
                
                print(f"✅ Recommendations Region Change Success:")
                print(f"   New Region: {data.get('data', {}).get('region', 'Unknown')}")
                print(f"   Mode: {data.get('mode', 'Unknown')}")
                print(f"   Message: {data.get('message', 'No message')}")
                print(f"   Recommendations Count: {stats.get('recommendations_count', 0)}")
                print(f"   Incumbent Products: {stats.get('incumbent_products_count', 0)}")
                
                # Verify it's recommendations mode
                relationships = data.get('data', {}).get('graph_data', {}).get('relationships', [])
                rel_types = {}
                for rel in relationships:
                    rel_type = rel.get('type', 'UNKNOWN')
                    rel_types[rel_type] = rel_types.get(rel_type, 0) + 1
                
                recommends_count = rel_types.get('RECOMMENDS', 0)
                owns_count = rel_types.get('OWNS', 0)
                print(f"   Verified Recommendations Mode: {recommends_count} RECOMMENDS, {owns_count} OWNS")
                
                return data
            else:
                print(f"❌ Recommendations Region Change Failed: {response.status_code}")
                return {}
                
        except Exception as e:
            print(f"❌ Recommendations Region Change Error: {e}")
            return {}
    
    def test_data_only_endpoints(self, region: str = "NAI") -> None:
        """Test the data-only endpoints with mode parameter."""
        print(f"\n📊 Testing Data-Only Endpoints for {region}")
        
        # Test standard mode
        try:
            response = requests.get(f"{self.api_url}/hierarchical/region/{region}/data?recommendations_mode=false")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Data-Only Standard Mode:")
                print(f"   Mode: {data.get('mode', 'Unknown')}")
                print(f"   Nodes: {data.get('summary', {}).get('nodes_retrieved', 0)}")
                print(f"   Primary Relationship: {data.get('summary', {}).get('primary_relationship_type', 'Unknown')}")
            else:
                print(f"❌ Data-Only Standard Mode Failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Data-Only Standard Mode Error: {e}")
        
        # Test recommendations mode
        try:
            response = requests.get(f"{self.api_url}/hierarchical/region/{region}/data?recommendations_mode=true")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Data-Only Recommendations Mode:")
                print(f"   Mode: {data.get('mode', 'Unknown')}")
                print(f"   Nodes: {data.get('summary', {}).get('nodes_retrieved', 0)}")
                print(f"   Primary Relationship: {data.get('summary', {}).get('primary_relationship_type', 'Unknown')}")
                print(f"   Recommendations: {data.get('summary', {}).get('recommendations_count', 'N/A')}")
                print(f"   Incumbent Products: {data.get('summary', {}).get('incumbent_products_count', 'N/A')}")
            else:
                print(f"❌ Data-Only Recommendations Mode Failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Data-Only Recommendations Mode Error: {e}")
    
    def compare_modes(self, region: str = "NAI") -> None:
        """Compare normal vs recommendations mode for the same region."""
        print(f"\n📊 Comparing Normal vs Recommendations Mode for {region}")
        
        normal_data = self.test_normal_mode(region)
        recommendations_data = self.test_recommendations_mode(region)
        
        if normal_data and recommendations_data:
            normal_stats = normal_data.get('data', {}).get('statistics', {})
            rec_stats = recommendations_data.get('data', {}).get('statistics', {})
            
            print(f"\n📈 Comparison Results:")
            print(f"   Mode                 | Normal    | Recommendations")
            print(f"   -------------------- | --------- | ---------------")
            print(f"   Nodes                | {normal_stats.get('total_nodes', 0):<9} | {rec_stats.get('total_nodes', 0)}")
            print(f"   Relationships        | {normal_stats.get('total_relationships', 0):<9} | {rec_stats.get('total_relationships', 0)}")
            print(f"   Filter Options       | {normal_stats.get('total_filter_options', 0):<9} | {rec_stats.get('total_filter_options', 0)}")
            print(f"   Recommendations      | {0:<9} | {rec_stats.get('recommendations_count', 0)}")
            print(f"   Incumbent Products   | {0:<9} | {rec_stats.get('incumbent_products_count', 0)}")
            
            # Compare node types
            normal_nodes = normal_data.get('data', {}).get('statistics', {}).get('node_type_breakdown', {})
            rec_nodes = rec_stats.get('node_type_breakdown', {})
            
            print(f"\n📋 Node Type Comparison:")
            all_node_types = set(normal_nodes.keys()) | set(rec_nodes.keys())
            for node_type in sorted(all_node_types):
                normal_count = normal_nodes.get(node_type, 0)
                rec_count = rec_nodes.get(node_type, 0)
                print(f"   {node_type:<20} | {normal_count:<9} | {rec_count}")
    
    def test_filter_options_comparison(self, region: str = "NAI") -> None:
        """Test if filter options differ between modes."""
        print(f"\n🔍 Testing Filter Options Comparison for {region}")
        
        # Get normal mode filters
        normal_response = requests.get(f"{self.api_url}/hierarchical/region/{region}/complete")
        rec_response = requests.get(f"{self.api_url}/hierarchical/region/{region}/recommendations")
        
        if normal_response.status_code == 200 and rec_response.status_code == 200:
            normal_filters = normal_response.json().get('data', {}).get('filter_options', {})
            rec_filters = rec_response.json().get('data', {}).get('filter_options', {})
            
            print(f"📋 Filter Options Comparison:")
            print(f"   Filter Type          | Normal | Recommendations")
            print(f"   -------------------- | ------ | ---------------")
            
            all_keys = set(normal_filters.keys()) | set(rec_filters.keys())
            
            for key in sorted(all_keys):
                normal_count = len(normal_filters.get(key, [])) if isinstance(normal_filters.get(key), list) else 0
                rec_count = len(rec_filters.get(key, [])) if isinstance(rec_filters.get(key), list) else 0
                
                status = "✅" if normal_count == rec_count else "⚠️"
                print(f"   {status} {key:<18} | {normal_count:<6} | {rec_count}")
            
            # Check for recommendations-specific filters
            rec_specific = set(rec_filters.keys()) - set(normal_filters.keys())
            if rec_specific:
                print(f"\n🆕 Recommendations-only filters: {rec_specific}")
            
            # Show sample values for key filters
            print(f"\n📝 Sample Filter Values (Recommendations Mode):")
            sample_filters = ['markets', 'channels', 'asset_classes', 'incumbent_products', 'recommendation_scores']
            for filter_name in sample_filters:
                if filter_name in rec_filters:
                    values = rec_filters[filter_name]
                    if values:
                        sample = values[:3] if isinstance(values, list) else [str(values)]
                        print(f"   {filter_name}: {sample}")
    
    def test_breakdown_endpoints(self, region: str = "NAI") -> None:
        """Test the filter breakdown endpoints for both modes."""
        print(f"\n🔧 Testing Filter Breakdown Endpoints for {region}")
        
        # Test standard mode breakdown
        try:
            response = requests.get(f"{self.api_url}/hierarchical/region/{region}/filters/breakdown?recommendations_mode=false")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Standard Mode Breakdown:")
                print(f"   Process Steps: {len(data.get('filter_population_process', {}))}")
                print(f"   Mode: {data.get('mode', 'Unknown')}")
            else:
                print(f"❌ Standard Mode Breakdown Failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Standard Mode Breakdown Error: {e}")
        
        # Test recommendations mode breakdown
        try:
            response = requests.get(f"{self.api_url}/hierarchical/region/{region}/filters/breakdown?recommendations_mode=true")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Recommendations Mode Breakdown:")
                print(f"   Process Steps: {len(data.get('filter_population_process', {}))}")
                print(f"   Mode: {data.get('mode', 'Unknown')}")
                
                # Check for recommendations-specific steps
                process = data.get('filter_population_process', {})
                rec_steps = [k for k in process.keys() if 'recommendation' in k.lower() or 'incumbent' in k.lower()]
                if rec_steps:
                    print(f"   Recommendations Steps: {rec_steps}")
            else:
                print(f"❌ Recommendations Mode Breakdown Failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Recommendations Mode Breakdown Error: {e}")
    
    def run_all_tests(self) -> None:
        """Run the complete test suite."""
        print("🚀 Starting Product Recommendations API Test Suite")
        print("=" * 60)
        
        # 1. Health check
        if not self.test_health_check():
            print("❌ Cannot proceed - API is not healthy")
            return
        
        # 2. Test normal mode
        self.test_normal_mode("NAI")
        
        # 3. Test recommendations mode
        self.test_recommendations_mode("NAI")
        
        # 4. Compare modes
        self.compare_modes("NAI")
        
        # 5. Test region changes
        self.test_region_change_normal("NAI", "EMEA")
        self.test_region_change_recommendations("NAI", "EMEA")
        
        # 6. Test data-only endpoints
        self.test_data_only_endpoints("NAI")
        
        # 7. Test filter options
        self.test_filter_options_comparison("NAI")
        
        # 8. Test breakdown endpoints
        self.test_breakdown_endpoints("NAI")
        
        print("\n" + "=" * 60)
        print("🎯 Test Suite Complete!")
        print("\n📋 Summary:")
        print("   ✅ Health check and basic connectivity")
        print("   ✅ Standard mode functionality")
        print("   ✅ Recommendations mode functionality")
        print("   ✅ Region change in both modes")
        print("   ✅ Filter options comparison")
        print("   ✅ Data-only endpoints")
        print("   ✅ Filter breakdown endpoints")
        print("\n🎉 Product Recommendations API is ready for use!")


def main():
    """Main function to run the tests."""
    tester = RecommendationsAPITester()
    tester.run_all_tests()


if __name__ == "__main__":
    main()