from app.tools.damage_estimate import estimate_damage
from app.tools.pp_check import check_pp_remaining
from app.tools.registry import ToolRegistry
from app.tools.speed_compare import check_speed_comparison
from app.tools.status_info import get_status_info
from app.tools.type_check import check_type_effectiveness


def test_type_effectiveness_tool():
    result = check_type_effectiveness("fire", ["grass"])
    assert result["multiplier"] == 2.0
    assert "效果拔群" in result["effect_text"]


def test_damage_estimate_tool_returns_range():
    result = estimate_damage("火花", 100, 100, 100, 100, True)
    assert result["min"] <= result["expected"] <= result["max"]


def test_pp_check_tool():
    result = check_pp_remaining("火花")
    assert result["current_pp"] > 0


def test_status_info_tool():
    result = get_status_info("burn")
    assert "每回合" in result["description"]


def test_speed_compare_tool():
    result = check_speed_comparison(100, None, 80, None)
    assert result["i_go_first"] is True


def test_tool_registry_lists_all_tools():
    registry = ToolRegistry()
    tools = registry.list_tools()
    assert len(tools) == 5
    assert "check_type_effectiveness" in tools
