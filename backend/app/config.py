from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    nebius_api_key: str = ""
    tavily_api_key: str = ""
    nebius_base_url: str = "https://api.tokenfactory.nebius.com/v1/"
    vision_model: str = "nvidia/Nemotron-3.5-Super-VL"
    text_model: str = "nvidia/Nemotron-3_5-Lightning"
    cors_origins: str = "http://localhost:3847,http://127.0.0.1:3847"
    max_image_bytes: int = 8 * 1024 * 1024
    allow_demo_mode: bool = True
    force_demo_mode: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def demo_mode(self) -> bool:
        if self.force_demo_mode:
            return True
        if not self.allow_demo_mode:
            return False
        return not (self.nebius_api_key and self.tavily_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
