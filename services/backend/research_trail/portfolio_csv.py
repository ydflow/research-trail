"""Strict snapshot CSV, independently implemented in Python (Folio parser was only a reference)."""
import csv
import hashlib
import io
import json
from pydantic import ValidationError
from .portfolio_contracts import HoldingInput, CashInput, PortfolioSnapshot, ImportIssue

HEADER = ['record_type','symbol','currency','quantity','cost_price','market_price','amount']

def fingerprint(snapshot):
    data = snapshot.model_dump()
    data['holdings'].sort(key=lambda h:(h['symbol'],h['currency']))
    data['cash'].sort(key=lambda c:c['currency'])
    return hashlib.sha256(json.dumps(data, sort_keys=True, separators=(',',':')).encode()).hexdigest()

def parse_csv(text):
    issues=[]; holdings=[]; cash=[]; seen=set()
    def issue(line, code, message): issues.append(ImportIssue(line=line,code=code,message=message))
    if len(text.encode('utf-8')) > 131072 or '\x00' in text:
        issue(1,'FILE_LIMIT','文件须为UTF-8文本且不超过128KiB。')
        return PortfolioSnapshot(), issues
    reader = csv.reader(io.StringIO(text.lstrip('\ufeff'), newline=''), strict=True)
    try:
        header = next(reader, None)
        if header is None or len(header)!=len(HEADER) or set(header)!=set(HEADER):
            issue(1,'HEADER','表头须包含约定的七列，不能缺失、重复或增加未知列。')
            return PortfolioSnapshot(), issues
        count=0
        for fields in reader:
            line=reader.line_num
            if not fields or all(not f.strip() for f in fields): continue
            count+=1
            if count>100:
                issue(line,'ROW_LIMIT','每次最多100条持仓与现金记录。'); break
            if len(fields)!=len(header): issue(line,'COLUMN_COUNT','列数与表头不一致。'); continue
            row=dict(zip(header, (v.strip() for v in fields)))
            try:
                if row['record_type']=='holding':
                    if row['amount']: raise ValueError()
                    item=HoldingInput(symbol=row['symbol'],currency=row['currency'],quantity=row['quantity'],
                        cost_price=row['cost_price'] or None,market_price=row['market_price'] or None)
                    key=('holding',item.symbol,item.currency)
                    if key not in seen: holdings.append(item)
                elif row['record_type']=='cash':
                    if any(row[k] for k in ('symbol','quantity','cost_price','market_price')) or not row['amount']:
                        raise ValueError()
                    item=CashInput(currency=row['currency'],amount=row['amount']); key=('cash',item.currency)
                    if key not in seen: cash.append(item)
                else: raise ValueError()
                if key in seen: issue(line,'DUPLICATE_ROW','同一币种现金或同一证券与币种持仓重复。')
                seen.add(key)
            except (ValidationError,ValueError):
                # No original cell, name, account number or rejected content in diagnostics.
                issue(line,'INVALID_ROW','记录类型、代码、币种或十进制数值无效；空价格表示缺失。')
    except csv.Error:
        issue(reader.line_num,'CSV_SYNTAX','CSV引号或分隔格式无效。')
    if 'count' in locals() and count==0:
        issue(2,'EMPTY','至少需要一条现金或持仓记录；零金额现金可表示空快照。')
    return PortfolioSnapshot(holdings=holdings,cash=cash), issues
