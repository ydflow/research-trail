"""Markdown and deterministic differences over two persisted report documents."""
import html
import re
from .report_contracts import ReportMarkdown, ReportDiff, ReportChange
from .report_facts import canonical
from .research_store import ResearchError

def escape(value):
    return re.sub(r'([\\`*_{}\[\]()#+.!|>~-])',r'\\\1',html.escape(str(value),quote=True)).replace('\n',' ')

def markdown(job):
    doc=job.document; syn=doc.synthesis
    lines=[f'# 研迹研究报告 · {escape(doc.symbol)}', '',
        f'报告 {job.id} · 版本 {job.version} · 合成器 {job.mode} · 状态 {job.status}',
        f'数据模式：{doc.source_mode}（模拟数据不代表真实行情） · 提供商：{escape(doc.provider)}',
        f'采集任务：{doc.source_run_id} · 采集状态：{doc.collection_status} · 策略：{escape(doc.strategy)}',
        '',escape(doc.disclaimer), '',f'分析立场：{syn.stance}（未核实判断）']
    facts={f.id:f for f in doc.evidence}
    if doc.event_context:
        ctx=doc.event_context; event=ctx.event
        lines.extend(['','## 事件研究上下文','',escape(event.title),escape(event.display_time),
            f'来源发生状态：{event.occurrence_status} · 时间关系：{event.time_relation}',
            f'事件快照：{ctx.snapshot_id} · 事件ID：{event.id} · 读取：{event.read_id}',
            f'原始结果SHA256：{ctx.result_hash} · JSON Pointer：{escape(event.pointer)}',
            '研究股票关联：'+('来源关联' if ctx.association=='source' else '用户自主选择，来源未声明该股票关联'),escape(ctx.label)])
    def claims(title,items):
        lines.extend(['',f'## {escape(title)}',''])
        for item in items:
            if item.kind=='fact':
                text='；'.join(escape(f'{facts[i].capability}{facts[i].pointer} = {canonical(facts[i].value)}') for i in item.evidence_ids)
            else: text=escape(item.text)
            links=' '.join(f'[{i}](#{i})' for i in item.evidence_ids)
            lines.append(f'- 【{dict(fact="事实",analysis="分析",prediction="预测")[item.kind]}】{text} {links}')
    claims('摘要',syn.summary)
    for section in syn.sections: claims(section.title,section.claims)
    for title,key in [('风险','risks'),('催化因素','catalysts'),('多头论点','bull_case'),('空头论点','bear_case')]: claims(title,getattr(syn,key))
    lines.extend(['','## 数据缺口',''])
    lines.extend(f'- {escape(g.scope)} · {escape(g.key)} · {escape(g.code)}' for g in doc.gaps)
    if not doc.gaps: lines.append('- 当前投影范围内未记录缺口；这不保证资料完整。')
    lines.extend(['','## 原始事实索引','', '下列值来自已保存执行结果。完整原始结果可在桌面内用“查看原始事实”读取。'])
    for fact in doc.evidence:
        lines.extend(['',f'### {fact.id}','',
            f'- 执行任务：{fact.run_id} · 序号：{fact.ordinal} · 能力：{escape(fact.capability)}',
            f'- JSON Pointer：{escape(fact.pointer)} · 原值：{escape(canonical(fact.value))}',
            f'- 来源：{escape(fact.provider)} · 数据模式：{fact.source_mode} · 获取时间：{escape(fact.fetched_at)}',
            f'- 原始结果 SHA256：{fact.result_hash}'])
    content='\n'.join(lines)+'\n'
    if len(content.encode())>512*1024: raise ResearchError('EXPORT_LIMIT')
    return ReportMarkdown(filename=f'research-report-{job.id}.md',content=content)

def diff(before,after):
    if before.id==after.id: raise ResearchError('DIFF_REQUIRES_TWO_REPORTS')
    a,b=before.document,after.document
    if a.symbol!=b.symbol or a.source_mode!=b.source_mode: raise ResearchError('DIFF_INCOMPATIBLE_SOURCES')
    changes=[]
    left={(f.capability,f.pointer):f for f in a.evidence}; right={(f.capability,f.pointer):f for f in b.evidence}
    for key in sorted(left.keys()|right.keys()):
        old,new=left.get(key),right.get(key)
        x,y=canonical(old.value) if old else None,canonical(new.value) if new else None
        if x!=y: changes.append(ReportChange(kind='fact',key=key[0]+key[1],before=x,after=y,
            before_evidence=old.id if old else None,after_evidence=new.id if new else None))
    def gaps(doc): return {(g.scope,g.key,g.code) for g in doc.gaps}
    lg,rg=gaps(a),gaps(b)
    for scope,key,code in sorted(lg^rg):
        changes.append(ReportChange(kind='gap',key=scope+':'+key,before=code if (scope,key,code) in lg else None,after=code if (scope,key,code) in rg else None))
    # Section descriptions use the same semantic references as the top-level groups.
    def normalized(doc):
        facts={f.id:(f.capability,f.pointer) for f in doc.evidence}
        def group(items): return [dict(kind=c.kind,text=c.text,references=[facts[i] for i in c.evidence_ids]) for c in items]
        syn=doc.synthesis
        out={k:canonical(group(getattr(syn,k))) for k in ('summary','risks','catalysts','bull_case','bear_case')}
        out['stance']=syn.stance
        for s in syn.sections: out['section:'+s.key]=canonical(dict(title=s.title,claims=group(s.claims)))
        return out
    la,ra=normalized(a),normalized(b)
    for key in sorted(la.keys()|ra.keys()):
        if la.get(key)!=ra.get(key): changes.append(ReportChange(kind='analysis',key=key,before=la.get(key),after=ra.get(key)))
    return ReportDiff(before_id=before.id,after_id=after.id,symbol=a.symbol,source_changed=a.provider!=b.provider or before.mode!=after.mode or a.strategy!=b.strategy,changes=changes)
