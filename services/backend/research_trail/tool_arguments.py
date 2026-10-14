"""Legacy stock arguments shared without importing the conversation/report graph."""
from pydantic import BaseModel, ConfigDict, Field


class ToolArguments(BaseModel):
    model_config = ConfigDict(extra='forbid', from_attributes=True)
    symbol: str = Field(pattern=r'^[A-Z0-9]{1,6}\.US$')
