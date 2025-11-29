import sys
import os
import json

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'plutus-backend'))

import db
from models import UserProfile, Portfolio, Holding, AgentResponse

def test_backend_flow():
    print("Initializing DB...")
    db.init_db()
    
    # 1. Create Profile
    print("\n1. Creating Profile...")
    profile = UserProfile(
        user_id="test_user",
        goal="Wealth Creation",
        horizon="5-10 years",
        risk_tolerance=7
    )
    db.save_user_profile(profile)
    saved_profile = db.get_user_profile("test_user")
    print(f"   Saved Profile: {saved_profile.goal}, Risk: {saved_profile.risk_tolerance}")
    assert saved_profile.user_id == "test_user"

    # 2. Add Portfolio
    print("\n2. Adding Portfolio...")
    holdings = [
        Holding(ticker="BANKETF", qty=100, avg_price=250.0),
        Holding(ticker="RELIANCE", qty=50, avg_price=2400.0)
    ]
    portfolio = Portfolio(user_id="test_user", holdings=holdings)
    db.save_portfolio(portfolio)
    saved_portfolio = db.get_portfolio("test_user")
    print(f"   Saved Portfolio Holdings: {len(saved_portfolio.holdings)}")
    assert len(saved_portfolio.holdings) == 2

    # 3. Run Agent (Directly calling agent logic as API would)
    print("\n3. Running Agent Analysis...")
    from agent import run_agent_analysis
    agent_response = run_agent_analysis(saved_portfolio.holdings)
    print(f"   Agent Action: {agent_response.action} {agent_response.ticker}")
    print(f"   Explanation: {agent_response.explanation}")
    print(f"   Audit Hash: {agent_response.audit_hash}")
    assert agent_response.action == "SELL" # Should sell BANKETF
    
    # 4. Approve Action
    print("\n4. Approving Action...")
    from datetime import datetime
    from models import AuditEntry
    from agent import generate_audit_hash
    
    prev_hash = db.get_latest_audit_hash()
    entry = AuditEntry(
        timestamp=datetime.now(),
        actor="User",
        action="APPROVE",
        details=f"Approved {agent_response.action} {agent_response.ticker}",
        audit_hash=generate_audit_hash({"action": "APPROVE", "ref": agent_response.audit_hash}, prev_hash),
        prev_hash=prev_hash
    )
    db.add_audit_entry(entry)
    print("   Action Approved.")
    
    # 5. Check Audit Log
    print("\n5. Checking Audit Log...")
    log = db.get_audit_log("test_user")
    print(f"   Audit Log Entries: {len(log)}")
    for e in log:
        print(f"   - [{e.timestamp}] {e.action}: {e.details} (Hash: {e.audit_hash[:8]}...)")
    
    assert len(log) >= 1
    assert log[0].action == "APPROVE"
    
    print("\nSUCCESS: All backend tests passed!")

if __name__ == "__main__":
    test_backend_flow()
