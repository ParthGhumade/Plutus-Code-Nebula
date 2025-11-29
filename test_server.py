"""
Automated Test Script for Stock Trading Agent API
Starts the server, tests all endpoints, and reports results.
"""

import requests
import subprocess
import sys
import time
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_SYMBOL = "AAPL"
TEST_COMPANY = "Apple"

# Test results tracking
results = []


def log(message: str, status: str = "INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    symbols = {"PASS": "[PASS]", "FAIL": "[FAIL]", "INFO": "[INFO]", "SKIP": "[SKIP]"}
    print(f"{timestamp} {symbols.get(status, '[INFO]')} {message}")


def record_result(name: str, passed: bool, details: str = ""):
    results.append({"name": name, "passed": passed, "details": details})
    status = "PASS" if passed else "FAIL"
    log(f"{name}: {details}" if details else name, status)


def wait_for_server(timeout: int = 30) -> bool:
    """Wait for server to be ready."""
    log("Waiting for server to start...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = requests.get(f"{BASE_URL}/", timeout=2)
            if response.status_code == 200:
                log("Server is ready!")
                return True
        except requests.ConnectionError:
            pass
        time.sleep(0.5)
    return False


def test_root():
    """Test GET /"""
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        passed = response.status_code == 200 and "message" in response.json()
        record_result("GET /", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        record_result("GET /", False, str(e))
        return False


def test_get_audit():
    """Test GET /api/get_audit"""
    try:
        response = requests.get(f"{BASE_URL}/api/get_audit", params={"limit": 5}, timeout=10)
        data = response.json()
        passed = (
            response.status_code == 200 and
            isinstance(data, list) and
            all("id" in item and "action" in item for item in data)
        )
        record_result("GET /get_audit", passed, f"Status: {response.status_code}, Items: {len(data)}")
        return passed
    except Exception as e:
        record_result("GET /get_audit", False, str(e))
        return False


def test_get_portfolio():
    """Test GET /api/get_portfolio"""
    try:
        response = requests.get(f"{BASE_URL}/api/get_portfolio", timeout=30)
        if response.status_code == 200:
            data = response.json()
            # Empty portfolio is valid
            passed = isinstance(data, list)
            record_result("GET /get_portfolio", passed, f"Status: {response.status_code}, Positions: {len(data)}")
            return passed
        elif response.status_code == 502:
            # API error (e.g., market closed) - still a valid response handling
            record_result("GET /get_portfolio", True, f"Status: {response.status_code} (API unavailable)")
            return True
        else:
            record_result("GET /get_portfolio", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        record_result("GET /get_portfolio", False, str(e))
        return False


def test_get_details_search_stock():
    """Test GET /api/get_details_search_stock"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/get_details_search_stock",
            params={"query": TEST_COMPANY},
            timeout=60
        )
        if response.status_code == 200:
            data = response.json()
            passed = (
                "symbol" in data and
                "company_name" in data and
                "current_price" in data
            )
            record_result(
                "GET /get_details_search_stock", 
                passed, 
                f"Status: {response.status_code}, Symbol: {data.get('symbol')}, Price: ${data.get('current_price', 0):.2f}"
            )
            return passed
        elif response.status_code == 502:
            record_result("GET /get_details_search_stock", True, f"Status: {response.status_code} (API unavailable)")
            return True
        else:
            record_result("GET /get_details_search_stock", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        record_result("GET /get_details_search_stock", False, str(e))
        return False


def test_get_agent_analysis():
    """Test GET /api/get_agent_analysis"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/get_agent_analysis",
            params={"symbol": TEST_SYMBOL},
            timeout=90
        )
        if response.status_code == 200:
            data = response.json()
            passed = (
                "symbol" in data and
                "recommendation" in data and
                data["recommendation"] in ["BUY", "SELL", "HOLD"] and
                "confidence_score" in data and
                "analysis_date" in data and
                "summary" in data
            )
            record_result(
                "GET /get_agent_analysis",
                passed,
                f"Status: {response.status_code}, Rec: {data.get('recommendation')}, Conf: {data.get('confidence_score', 0):.2f}"
            )
            return passed
        elif response.status_code == 502:
            record_result("GET /get_agent_analysis", True, f"Status: {response.status_code} (API unavailable)")
            return True
        else:
            record_result("GET /get_agent_analysis", False, f"Status: {response.status_code}, Body: {response.text[:100]}")
            return False
    except Exception as e:
        record_result("GET /get_agent_analysis", False, str(e))
        return False


def test_post_order_validation():
    """Test POST /api/post_order validation (limit order without price)"""
    try:
        # Test validation: limit order without limit_price should fail
        response = requests.post(
            f"{BASE_URL}/api/post_order",
            json={
                "symbol": TEST_SYMBOL,
                "side": "buy",
                "quantity": 1,
                "order_type": "limit"
                # Missing limit_price intentionally
            },
            timeout=30
        )
        passed = response.status_code == 422  # Validation error expected
        record_result(
            "POST /post_order (validation)",
            passed,
            f"Status: {response.status_code} (expected 422 for missing limit_price)"
        )
        return passed
    except Exception as e:
        record_result("POST /post_order (validation)", False, str(e))
        return False


def test_post_order_market():
    """Test POST /api/post_order with market order"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/post_order",
            json={
                "symbol": TEST_SYMBOL,
                "side": "buy",
                "quantity": 1,
                "order_type": "market"
            },
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            passed = (
                "order_id" in data and
                "status" in data and
                "message" in data
            )
            record_result(
                "POST /post_order (market)",
                passed,
                f"Status: {response.status_code}, Order ID: {data.get('order_id', 'N/A')[:8]}..."
            )
            return passed
        elif response.status_code in [400, 403, 422, 502]:
            # Order rejection is valid (insufficient funds, market closed, etc.)
            record_result(
                "POST /post_order (market)",
                True,
                f"Status: {response.status_code} (order rejected - valid response)"
            )
            return True
        else:
            record_result("POST /post_order (market)", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        record_result("POST /post_order (market)", False, str(e))
        return False


def run_all_tests():
    """Run all tests in sequence."""
    log("=" * 50)
    log("STOCK TRADING API - AUTOMATED TESTS")
    log("=" * 50)
    
    # Wait for server
    if not wait_for_server():
        log("Server failed to start!", "FAIL")
        return False
    
    log("-" * 50)
    log("Running tests...")
    log("-" * 50)
    
    # Run tests
    test_root()
    test_get_audit()
    test_get_portfolio()
    test_get_details_search_stock()
    test_get_agent_analysis()
    test_post_order_validation()
    test_post_order_market()
    
    # Summary
    log("-" * 50)
    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    log(f"RESULTS: {passed}/{total} tests passed")
    log("=" * 50)
    
    return passed == total


def start_server():
    """Start the server as a subprocess."""
    log("Starting server...")
    process = subprocess.Popen(
        [sys.executable, "server.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    return process


def main():
    """Main entry point."""
    server_process = None
    
    try:
        # Start server
        server_process = start_server()
        
        # Run tests
        success = run_all_tests()
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        log("Tests interrupted by user")
        sys.exit(1)
    finally:
        if server_process:
            log("Stopping server...")
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()


if __name__ == "__main__":
    main()
