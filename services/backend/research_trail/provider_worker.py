"""One SDK read in an isolated owned process. No raw exception or SDK logging output."""
import json
import logging
import sys
from .provider_contracts import ProviderConfiguration, ReadQuery
from .provider_settings import ProviderSnapshot
from .provider_sdk import execute_sdk
from .provider_errors import classify

def main():
    logging.disable(logging.CRITICAL)
    try:
        payload=json.loads(sys.stdin.buffer.read(16385))
        snapshot=ProviderSnapshot(payload['provider'],ProviderConfiguration(**payload['configuration']),0,payload['credentials'])
        query=ReadQuery(**payload['query'])
        if snapshot.provider=='massive':
            from .provider_massive import MassiveProvider
            data=MassiveProvider().execute(snapshot,query)
        else:
            data=execute_sdk(snapshot,query)
        result={'ok':True,'data':data}
    except Exception as error:
        safe=classify(error)
        result={'ok':False,'code':safe.code,'state':safe.state,'retryable':safe.retryable}
    print(json.dumps(result,ensure_ascii=False,allow_nan=False))

if __name__=='__main__': main()
