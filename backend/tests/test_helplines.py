import pytest
from app.models.incident import ContextSource, Helpline, HelplineDirectory
from app.services.helplines import supported_helplines, resolve_incident_area


def source(text='Example District fire response telephone: 123-456-7890.'):
    return ContextSource(title='Official test fixture', url='https://fire.example.gov/fire', snippet=text, query='test')


def contact(**changes):
    values = dict(service='Fire service', phone='123-456-7890', jurisdiction='Example District', purpose='Report an active fire', source_url=source().url, evidence_quote=source().snippet)
    return Helpline(**(values | changes))


def test_only_source_supported_contacts_survive():
    good = contact()
    assert supported_helplines([good, good], [source()]) == [good]
    assert not supported_helplines([contact(phone='999-999-9999')], [source()])
    assert not supported_helplines([contact(source_url='https://invented.example/')], [source()])
    assert not supported_helplines([contact(evidence_quote='Invented contact: 123-456-7890')], [source()])
    assert not supported_helplines([contact(source_url='javascript:bad')], [source()])


def test_short_codes_must_not_match_inside_longer_numbers():
    assert not supported_helplines([contact(phone='123')], [source()])
    short = source('Example District emergency response: 123. Fire response: 456.')
    assert supported_helplines([contact(phone='123', evidence_quote=short.snippet)], [short])


@pytest.mark.asyncio
async def test_coordinates_resolve_to_area_but_existing_addresses_are_preserved(monkeypatch):
    import httpx
    class Response:
        def raise_for_status(self): pass
        def json(self): return {'features':[{'properties':{'city':'Example City','state':'Example State','country':'Example Country'}}]}
    async def reverse(self, url, **kwargs):
        assert kwargs['params'] == {'lat':10, 'lon':20}
        return Response()
    monkeypatch.setattr(httpx.AsyncClient, 'get', reverse)
    assert 'Example Country' in await resolve_incident_area('10, 20', 10, 20)
    assert await resolve_incident_area('Known City, Country', 10, 20) == 'Known City, Country'


@pytest.mark.asyncio
async def test_live_pipeline_attaches_contacts_even_when_brief_omits_them(monkeypatch):
    from app.agents.incident_pipeline import IncidentPipeline
    from app.agents import demo_data
    from app.config import Settings
    pipeline = IncidentPipeline(Settings(nebius_api_key='test', tavily_api_key='test', force_demo_mode=False))
    visual = demo_data.demo_visual('Example District', 'Smoke')
    assessment = demo_data.demo_assessment('Example District')
    report = demo_data.demo_report(location='Example District', report_text='Smoke', visual=visual, assessment=assessment, sources=[source()])
    report.live_context_summary = 'Call 999-999-9999 for assistance.'
    report.markdown_report = '## Helplines\nCall 999-999-9999'
    async def vision(**kwargs): return visual.model_dump()
    async def text(**kwargs):
        name = kwargs['schema_name']
        if name == 'severity_assessment': return assessment.model_dump()
        if name == 'helpline_directory': return HelplineDirectory(helplines=[contact(), contact(phone='999')]).model_dump()
        assert 'helplines' in kwargs['user_text'].lower() or '123-456-7890' in kwargs['user_text']
        return report.model_dump()
    searches=[]
    def search(query, **kwargs):
        searches.append((query,kwargs))
        return [source()]
    monkeypatch.setattr(pipeline.nebius, 'vision_json', vision)
    monkeypatch.setattr(pipeline.nebius, 'text_json', text)
    monkeypatch.setattr(pipeline.tavily, 'search', search)
    result = await pipeline.run(image_bytes=b'image', mime='image/png', report_text='Smoke', location='Example District', transcript=None, latitude=None, longitude=None)
    assert len(result.report.helplines) == 1
    assert result.report.helplines[0].phone == '123-456-7890'
    assert '## Helplines' in result.report.markdown_report
    assert '999-999-9999' not in result.report.live_context_summary
    assert '999-999-9999' not in result.report.markdown_report
    assert any(options.get('contacts') for _, options in searches)
    assert all('Example District' in query for query, options in searches if options.get('contacts'))


@pytest.mark.asyncio
async def test_reverse_lookup_failure_keeps_unresolved_coordinates(monkeypatch):
    import httpx
    async def fail(self, *args, **kwargs): raise httpx.ConnectError('offline')
    monkeypatch.setattr(httpx.AsyncClient, 'get', fail)
    assert await resolve_incident_area('10, 20', 10, 20) == '10, 20'


def test_empty_search_evidence_cannot_create_contacts():
    assert supported_helplines([contact()], []) == []


def test_third_party_directories_and_government_looking_hosts_are_excluded():
    for url in ['https://directory.example/contacts', 'https://agency.gov.example.com/fire']:
        evidence = source().model_copy(update={'url':url})
        assert supported_helplines([contact(source_url=url)], [evidence]) == []


def test_india_fire_has_official_numbers_without_model_or_search():
    from app.services.helplines import official_helplines
    result = official_helplines('Indore, Madhya Pradesh, India', 'electrical_fire')
    assert {item.phone for item in result} == {'112', '101'}
    assert all(item.source_kind == 'official_directory' for item in result)
    assert all(item.last_reviewed == '2026-10-28' for item in result)
    assert any('indore.nic.in' in item.source_url for item in result if item.phone == '101')


def test_national_fallback_never_guesses_country_from_locale_or_place_fragment():
    from app.services.helplines import official_helplines
    for location in ['22.537918, 75.752807', 'Mhow', 'Indianapolis, Indiana, United States', 'London, United Kingdom']:
        assert official_helplines(location, 'fire') == []


def test_short_quote_cannot_manufacture_code_from_longer_phone():
    assert supported_helplines([contact(phone='123', evidence_quote='123')], [source()]) == []


def test_official_endpoint_works_without_any_provider_and_validates_input(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.clients.tavily import TavilySearchClient
    def forbidden(*args, **kwargs): raise AssertionError('Official references must not send searches')
    monkeypatch.setattr(TavilySearchClient, 'search', forbidden)
    client = TestClient(app)
    response = client.post('/api/incidents/helplines/official', json={'location':'Indore, Madhya Pradesh, India','category':'electrical_fire'})
    assert response.status_code == 200
    data = response.json()
    assert {item['phone'] for item in data['helplines']} == {'112','101'}
    assert data['helpline_lookup_state'] == 'official_fallback'
    assert '112' in data['markdown_section'] and '101' in data['markdown_section']
    assert client.post('/api/incidents/helplines/official', json={'location':'x','category':'fire'}).status_code == 422
    response = client.post('/api/incidents/helplines/official', json={'location':'Unknown country','category':'fire'})
    assert response.json()['helplines'] == []
    assert response.json()['helpline_lookup_state'] == 'not_found'


@pytest.mark.asyncio
async def test_fire_report_still_has_official_numbers_when_all_search_and_directory_calls_fail(monkeypatch):
    from app.agents.incident_pipeline import IncidentPipeline
    from app.agents import demo_data
    from app.config import Settings
    pipeline = IncidentPipeline(Settings(nebius_api_key='test',tavily_api_key='test',force_demo_mode=False))
    visual = demo_data.demo_visual('Example City, India', 'Reported fire')
    assessment = demo_data.demo_assessment('Example City, India')
    report = demo_data.demo_report(location='Example City, India',report_text='Reported fire',visual=visual,assessment=assessment,sources=[])
    report.emergency_notice = None
    async def vision(**kwargs): return visual.model_dump()
    async def text(**kwargs):
        if kwargs['schema_name'] == 'severity_assessment': return assessment.model_dump()
        if kwargs['schema_name'] == 'helpline_directory': raise RuntimeError('Provider unavailable')
        return report.model_dump()
    def search(*args, **kwargs): raise RuntimeError('Search unavailable')
    monkeypatch.setattr(pipeline.nebius,'vision_json',vision)
    monkeypatch.setattr(pipeline.nebius,'text_json',text)
    monkeypatch.setattr(pipeline.tavily,'search',search)
    result = await pipeline.run(image_bytes=b'image',mime='image/png',report_text='Reported electrical fire',location='Example City, India',transcript=None,latitude=None,longitude=None)
    assert {item.phone for item in result.report.helplines} == {'112','101'}
    assert result.report.helpline_lookup_state == 'official_fallback'
    assert '112' in result.report.markdown_report
    assert result.report.emergency_notice
    assert next(step for step in result.trace if step.step == 'helpline_lookup').status == 'error'
    assert next(step for step in result.trace if step.step == 'tavily_search').status == 'error'


def test_contact_search_targets_official_domains_for_india(monkeypatch):
    from app.clients.tavily import TavilySearchClient
    from app.config import Settings
    client = TavilySearchClient(Settings(tavily_api_key='test'))
    seen = []
    def search(**kwargs): seen.append(kwargs); return {'results':[]}
    monkeypatch.setattr(client.client, 'search', search)
    client.search('Example City, India fire helpline', contacts=True)
    assert seen[0]['include_domains'] == ['gov.in','nic.in']


def test_model_cannot_forge_official_directory_review_metadata():
    candidate = contact(source_kind='official_directory',last_reviewed='2099-01-01')
    result = supported_helplines([candidate], [source()])
    assert result[0].source_kind == 'live_lookup'
    assert result[0].last_reviewed is None
