"""Fixed safe errors; provider exception text, stderr and bodies never escape."""
MESSAGES = {
    'PROVIDER_UNCONFIGURED': '提供商未配置。', 'PROVIDER_DISABLED': '提供商已停用。',
    'CREDENTIAL_MISSING': '请仅在本机保存此提供商所需凭证。', 'CREDENTIAL_INVALID': '本机凭证类型无效。',
    'VAULT_UNAVAILABLE': '系统凭证存储不可用。', 'AUTH_FAILED': '认证失败或凭证已失效。',
    'ACCESS_DENIED': '此能力的账户或行情权限受限。', 'RATE_LIMITED': '请求被限流；未自动重试。',
    'TIMEOUT': '只读查询超时，所属查询进程已停止。', 'CANCELLED': '只读查询已取消。',
    'NETWORK_ERROR': '数据服务网络连接失败。', 'PROVIDER_ERROR': '数据服务查询失败。',
    'INVALID_RESPONSE': '提供商返回格式或数值异常。', 'RESPONSE_LIMIT': '响应超过安全大小上限。',
    'UNSUPPORTED_CAPABILITY': '此提供商未实现该能力。', 'UNSUPPORTED_MARKET': '此提供商不支持所选市场。',
    'CLI_UNAVAILABLE': '需要配置本机只读Longbridge CLI路径；未执行安装或登录。',
    'CLI_AUTH_REQUIRED': 'CLI需要本机已有会话；研迹不执行登录或管理其凭证。',
    'SDK_UNAVAILABLE': '当前官方SDK接口不可用。', 'NO_DATA': '服务未返回该请求的数据。',
}

class ProviderFault(Exception):
    def __init__(self, code, state='failed', retryable=False):
        self.code, self.state, self.retryable = code, state, retryable
        super().__init__(MESSAGES[code])

def classify(error):
    if isinstance(error, ProviderFault): return error
    code = getattr(error, 'code', None)
    if code in (401003, 403201, 403203): return ProviderFault('AUTH_FAILED')
    if code in (403205, 403): return ProviderFault('ACCESS_DENIED', 'restricted')
    if code in (429001, 429002, 429): return ProviderFault('RATE_LIMITED', retryable=True)
    if isinstance(error, TimeoutError): return ProviderFault('TIMEOUT', 'timed_out', True)
    return ProviderFault('PROVIDER_ERROR')
