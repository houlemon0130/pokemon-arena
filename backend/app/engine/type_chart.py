TYPES = [
    "normal",
    "fire",
    "water",
    "electric",
    "grass",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
]


def _neutral_row() -> dict[str, float]:
    return {pokemon_type: 1.0 for pokemon_type in TYPES}


TYPE_CHART: dict[str, dict[str, float]] = {pokemon_type: _neutral_row() for pokemon_type in TYPES}

_SUPER_EFFECTIVE = {
    "fire": ["grass", "ice", "bug", "steel"],
    "water": ["fire", "ground", "rock"],
    "electric": ["water", "flying"],
    "grass": ["water", "ground", "rock"],
    "ice": ["grass", "ground", "flying", "dragon"],
    "fighting": ["normal", "ice", "rock", "dark", "steel"],
    "poison": ["grass", "fairy"],
    "ground": ["fire", "electric", "poison", "rock", "steel"],
    "flying": ["grass", "fighting", "bug"],
    "psychic": ["fighting", "poison"],
    "bug": ["grass", "psychic", "dark"],
    "rock": ["fire", "ice", "flying", "bug"],
    "ghost": ["psychic", "ghost"],
    "dragon": ["dragon"],
    "dark": ["psychic", "ghost"],
    "steel": ["ice", "rock", "fairy"],
    "fairy": ["fighting", "dragon", "dark"],
}

_NOT_VERY_EFFECTIVE = {
    "normal": ["rock", "steel"],
    "fire": ["fire", "water", "rock", "dragon"],
    "water": ["water", "grass", "dragon"],
    "electric": ["electric", "grass", "dragon"],
    "grass": ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
    "ice": ["fire", "water", "ice", "steel"],
    "fighting": ["poison", "flying", "psychic", "bug", "fairy"],
    "poison": ["poison", "ground", "rock", "ghost"],
    "ground": ["grass", "bug"],
    "flying": ["electric", "rock", "steel"],
    "psychic": ["psychic", "steel"],
    "bug": ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
    "rock": ["fighting", "ground", "steel"],
    "ghost": ["dark"],
    "dragon": ["steel"],
    "dark": ["fighting", "dark", "fairy"],
    "steel": ["fire", "water", "electric", "steel"],
    "fairy": ["fire", "poison", "steel"],
}

_NO_EFFECT = {
    "normal": ["ghost"],
    "electric": ["ground"],
    "fighting": ["ghost"],
    "poison": ["steel"],
    "ground": ["flying"],
    "psychic": ["dark"],
    "ghost": ["normal"],
    "dragon": ["fairy"],
}

for move_type, defender_types in _SUPER_EFFECTIVE.items():
    for defender_type in defender_types:
        TYPE_CHART[move_type][defender_type] = 2.0

for move_type, defender_types in _NOT_VERY_EFFECTIVE.items():
    for defender_type in defender_types:
        TYPE_CHART[move_type][defender_type] = 0.5

for move_type, defender_types in _NO_EFFECT.items():
    for defender_type in defender_types:
        TYPE_CHART[move_type][defender_type] = 0.0


def get_effectiveness(move_type: str, defender_types: list[str]) -> float:
    multiplier = 1.0
    for defender_type in defender_types:
        multiplier *= TYPE_CHART[move_type][defender_type]
    return multiplier
