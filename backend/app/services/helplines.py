import re
from urllib.parse import urlsplit

import httpx

from app.models.incident import ContextSource, Helpline


def supported_helplines(contacts: list[Helpline], sources: list[ContextSource]) -> list[Helpline]:
    """Keep only contacts whose quoted evidence and phone appear in retrieved content."""
    accepted = []
    seen = set()
    for contact in contacts:
        parsed = urlsplit(contact.source_url)
        host = (parsed.hostname or '').lower()
        # Accept government/public emergency authorities; directories are not contact authorities.
        authority = host.endswith(('.gov', '.mil', '.police.uk', '.nhs.uk', '.nic.in')) or bool(
            re.search(r'\.(gov|gouv|gob|go|govt|gc)\.[a-z]{2}$', host)
        )
        if parsed.scheme not in {'http', 'https'} or not authority:
            continue
        number = re.sub(r'\D', '', contact.phone)
        if not 3 <= len(number) <= 15 or not re.fullmatch(r'\+?[\d\s().-]+', contact.phone):
            continue
        for source in sources:
            quote = ' '.join(contact.evidence_quote.split())
            content = ' '.join(source.snippet.split())
            if source.url != contact.source_url or not quote or quote not in content:
                continue
            # Short emergency codes must not match inside a longer phone number.
            numbers = [re.sub(r'\D', '', match) for match in re.findall(r'(?<!\d)\+?\d(?:[\d ().-]*\d)?(?!\d)', quote)]
            content_numbers = [re.sub(r'\D', '', match) for match in re.findall(r'(?<!\d)\+?\d(?:[\d ().-]*\d)?(?!\d)', content)]
            if number not in numbers or number not in content_numbers:
                continue
            key = (number, contact.service.casefold())
            if key not in seen:
                seen.add(key)
                accepted.append(contact.model_copy(update={"source_kind": "live_lookup", "last_reviewed": None}))
            break
    return accepted[:6]


def helpline_markdown(contacts: list[Helpline], status: str) -> str:
    return '\n\n## Helplines\n\n' + status + '\n\n' + '\n'.join(
        f'- **{item.service}: {item.phone}** — {item.jurisdiction}. {item.purpose} '
        f'[Source]({item.source_url})' for item in contacts
    )


async def resolve_incident_area(location: str, latitude: float | None, longitude: float | None) -> str:
    if latitude is None or longitude is None or not re.fullmatch(r"[\d\s,+.\-]+", location):
        return location
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return location
    try:
        async with httpx.AsyncClient(timeout=8, headers={"User-Agent": "IncidentOps/1.0"}) as client:
            response = await client.get("https://photon.komoot.io/reverse", params={"lat": latitude, "lon": longitude})
            response.raise_for_status()
            properties = response.json()["features"][0]["properties"]
            area = ', '.join(dict.fromkeys(properties[key] for key in ('city', 'county', 'state', 'country') if properties.get(key)))
            if properties.get('country'):
                return f"{area} (approximate reverse-geocoder area for {location})"
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        pass
    return location


def remove_contact_prose(text: str) -> str:
    # Contact recommendations belong only to the checked directory, never model prose.
    if re.search(r"\d", text) and re.search(r"\b(call|dial|phone|telephone|helpline|hotline|contact|number)\b", text, re.I):
        return "Use the sourced helpline directory for contact numbers and check the service jurisdiction before calling."
    return text


def official_helplines(location: str, category: str) -> list[Helpline]:
    """Reviewed official references, never inferred from IP, language or model memory."""
    if not re.search(r"\bindia\b", location, re.I):
        return []
    result = [Helpline(
        service="National emergency response", phone="112", jurisdiction="India (nationwide)",
        purpose="For immediate danger: police, fire and rescue, or medical assistance.",
        source_url="https://112.gov.in/", evidence_quote="Pan-India single number (112)",
        source_kind="official_directory", last_reviewed="2026-10-28",
    )]
    if re.search(r"\b(fire|smoke|flames|explosion)\b", category.replace('_', ' '), re.I):
        indore = bool(re.search(r"\b(mhow|indore)\b", location, re.I))
        result.append(Helpline(
            service="Fire and rescue", phone="101",
            jurisdiction="Indore district, Madhya Pradesh, India" if indore else "India",
            purpose="Report fire or smoke. Use the national emergency service if you cannot reach this number.",
            source_url="https://indore.nic.in/en/helpline/" if indore else "https://112.gov.in/about",
            evidence_quote="FIRE 101" if indore else "101 (Fire and Rescue)",
            source_kind="official_directory", last_reviewed="2026-10-28",
        ))
    return result


def merge_helplines(official: list[Helpline], live: list[Helpline]) -> list[Helpline]:
    # Keep the reviewed national contact first and avoid duplicate call buttons.
    seen = set()
    merged = []
    for contact in [*official, *live]:
        phone = re.sub(r'\D', '', contact.phone)
        if phone not in seen:
            seen.add(phone)
            merged.append(contact)
    return merged[:6]
