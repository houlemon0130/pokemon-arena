from .damage_estimate import estimate_damage
from .pp_check import check_pp_remaining
from .speed_compare import check_speed_comparison
from .status_info import get_status_info
from .type_check import check_type_effectiveness


class ToolRegistry:
    def __init__(self):
        self._tools = {
            "check_type_effectiveness": check_type_effectiveness,
            "estimate_damage": estimate_damage,
            "check_pp_remaining": check_pp_remaining,
            "get_status_info": get_status_info,
            "check_speed_comparison": check_speed_comparison,
        }

    def list_tools(self) -> list[str]:
        return list(self._tools.keys())

    def execute(self, tool_name: str, **kwargs) -> dict:
        if tool_name not in self._tools:
            raise ValueError(f"未知工具: {tool_name}")
        return self._tools[tool_name](**kwargs)
