"""Bounded extraction of heading facts only; source books/explanations are not copied.
Usage: python3 .../extractGrammarSources.py RAW_DIRECTORY OUTPUT_JSON
Requires Poppler pdftotext. Downloads are explicit, outside this script.
"""
import sys, re, json, hashlib, subprocess, html, unicodedata, datetime
from pathlib import Path
raw, output = map(Path, sys.argv[1:])
units=[]
def add(source, key, order, title, locator, forms, instructional=True):
    units.append(dict(id=f'{source}-{key}',sourceId=source,order=order,title=title,
        locator=locator,instructional=instructional,forms=forms))
def pdf(name):
    return subprocess.run(['pdftotext','-layout',str(raw/name),'-'],check=True,capture_output=True,text=True).stdout
# GENKI's left column contains numbered grammar headings; other columns are discarded.
lesson=None
for page, text in enumerate(pdf('genki.pdf').split('\f'),1):
    for line in text.splitlines():
        m=re.search(r'LESSON\s+(\d+)\s+(.+)',line)
        if m:
            lesson=int(m[1]);add('genki',str(lesson),lesson,m[2].strip(),f'Syllabus p.{page}, Lesson {lesson}',[])
        m=re.match(r'^\s*(\d+)\s+(.+)',line)
        if m and lesson and not 'Japan Times' in line:
            form=re.split(r'\s{3,}',m[2])[0].strip()
            if form:units[-1]['forms'].append(form)
# Shin Kanzen Master: only numbered grammar entries from the public HTML contents.
s=html.unescape(re.sub('<[^>]+>','\n',(raw/'kanzen.html').read_text()))
lines=[x.strip() for x in s.splitlines() if x.strip()]
start=lines.index('意味機能別の文法形式');end=next(i for i in range(start,len(lines)) if lines[i].startswith('第２部'))
current=None;order=0
for line in lines[start:end]:
    n=unicodedata.normalize('NFKC',line)
    if re.match(r'^(\d+課|[A-J]\s)',n):
        order+=1;current=f'unit-{order}';add('kanzen',current,order,line,f'Contents, {line}',[])
    elif current and re.match(r'^\d+\.',n):
        units[-1]['forms'].append(re.sub(r'^[０-９0-9]+[．.]','',line).strip())
# Irodori: numbered Grammar Notes headings, grouped by book and lesson.
# Some PDF headings have ruby/interleaved text. Keep raw headings; matching must
# flag partial extractions rather than guessing missing forms.
by={};books={'入門':0,'初級1':1,'初級2':2,'初中級':3}
for page,text in enumerate(pdf('irodori.pdf').split('\f'),1):
    footer=re.search(r'(入門|初級\s*[12]|初中級)\s+L(\d+)\s*-',text)
    if not footer:continue
    book=re.sub(r'\s','',footer[1]);lesson=int(footer[2]);key=f'{book}-{lesson}'
    if key not in by:
        add('irodori',key,books[book]*100+lesson,f'{book} Lesson {lesson}',f'Grammar Notes, {book} L{lesson}',[])
        by[key]=units[-1]
    for line in text.splitlines():
        m=re.match(r'^\s*[➊➋➌➍➎➏➐➑➒➓]\s+(.+)',line)
        if m:
            form=m[1].strip();form=re.split(r'\s{4,}',form)[0].strip()
            by[key]['forms'].append({'form':form,'locator':f'PDF p.{page}'})
# Pin the downloaded bytes by hash, but retain only the minimal heading inventory.
expected={'genki':23,'kanzen':22,'irodori':70}
for source,count in expected.items():
    actual=sum(u['sourceId']==source for u in units)
    if actual!=count:raise ValueError(f'{source}: expected {count} units, extracted {actual}; inspect source changes before updating the pinned extractor')
result={'schemaVersion':1,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'sha256':{name:hashlib.sha256((raw/name).read_bytes()).hexdigest() for name in ['genki.pdf','kanzen.html','irodori.pdf','kanzen-teaching.html']},'units':units}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({s:sum(len(u['forms']) for u in units if u['sourceId']==s) for s in ['genki','kanzen','irodori']})
