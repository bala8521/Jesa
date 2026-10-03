from dataclasses import dataclass


@dataclass(frozen=True)
class ModelConfig:
    name: str
    task: str
    provider: str


TTT_MODEL = ModelConfig(
    name="",
    task="text-generation",
    provider="huggingface",
)