"""Local configuration check; --run explicitly permits one readonly vendor query.

No keys, URLs, account IDs or returned data are printed or persisted.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import sqlite3
import threading
from .credentials import WindowsCredentialVault
from .database import default_database_path
from .provider_contracts import ProviderConfiguration, ProviderCredentials, ReadQuery
from .provider_errors import ProviderFault, classify
from .provider_process import sdk_process
from .provider_settings import ProviderSnapshot


def read_configuration(path, provider, vault=None):
    path=Path(path).resolve()
    if not path.is_file(): raise ProviderFault('PROVIDER_UNCONFIGURED','unconfigured')
    try:
        with sqlite3.connect(path.as_uri()+'?mode=ro',uri=True) as db:
            db.row_factory=sqlite3.Row
            if not db.execute("SELECT 1 FROM sqlite_master WHERE name='data_providers'").fetchone():
                raise ProviderFault('PROVIDER_UNCONFIGURED','unconfigured')
            row=db.execute('SELECT * FROM data_providers WHERE provider=?',(provider,)).fetchone()
        if row is None: raise ProviderFault('PROVIDER_UNCONFIGURED','unconfigured')
        config=ProviderConfiguration.model_validate_json(row['configuration'])
        if not config.enabled: raise ProviderFault('PROVIDER_DISABLED','disabled')
        if not row['credential_ref']: raise ProviderFault('CREDENTIAL_MISSING','unconfigured')
        namespace=sha256(str(path).casefold().encode()).hexdigest()[:32]
        secret=(vault or WindowsCredentialVault()).get(f"ResearchTrail/{namespace}/{row['credential_ref']}")
        if not secret: raise ProviderFault('CREDENTIAL_MISSING','unconfigured')
        bundle=ProviderCredentials.model_validate_json(secret)
        values={k:v.get_secret_value() for k,v in bundle if v is not None}
        if (provider=='massive')!=('api_key' in values): raise ProviderFault('CREDENTIAL_INVALID','unconfigured')
        return ProviderSnapshot(provider,config,row['revision'],values)
    except ProviderFault: raise
    except Exception: raise ProviderFault('VAULT_UNAVAILABLE') from None


def verify(path, provider, *, execute=False, vault=None, executor=sdk_process):
    try: snapshot=read_configuration(path,provider,vault)
    except ProviderFault as error:
        return {'provider':provider,'real_validation':'not_executed','reason':error.code,'queries_started':0}
    if not execute:
        return {'provider':provider,'real_validation':'not_executed','reason':'CONFIGURED_REQUIRES_EXPLICIT_RUN','queries_started':0}
    query=ReadQuery(capability='account.positions' if provider=='longbridge-account' else 'market.quote',
                    symbol='AAPL.US',mode='real',count=1,use_cache=False)
    try:
        data=executor(snapshot,query,threading.Event())
        # An empty positions list is a valid read; a quote must contain price and symbol.
        valid=isinstance(data,list) if provider=='longbridge-account' else isinstance(data,dict) and data.get('symbol')=='AAPL.US' and data.get('last_price') is not None
        if not valid: raise ProviderFault('INVALID_RESPONSE')
        return {'provider':provider,'real_validation':'passed','reason':None,'queries_started':1,
                'transport':'http' if provider=='massive' else 'sdk','data_persisted':False}
    except Exception as error:
        safe=classify(error)
        return {'provider':provider,'real_validation':'restricted' if safe.state=='restricted' else 'failed',
                'reason':safe.code,'queries_started':1,'data_persisted':False}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--provider',choices=['longbridge','longbridge-account','massive'],required=True)
    parser.add_argument('--run',action='store_true',help='allow exactly one readonly query; vendor SDK may also initialize a connection')
    args=parser.parse_args()
    result=verify(default_database_path(),args.provider,execute=args.run)
    print(json.dumps(result,ensure_ascii=False))
    return 1 if result['real_validation'] in ('failed','restricted') else 0

if __name__=='__main__': raise SystemExit(main())
