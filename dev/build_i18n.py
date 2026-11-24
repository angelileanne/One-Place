import re,glob,json,subprocess
s=open('index.html',encoding='utf8').read()
a=s.index('  var DICT = {'); b=s.index('  var origText = new WeakMap')
old=s[a:b]; old=old[:old.index('  var PFX')]
js='var DICT='+old[len('  var DICT = '):].rstrip().rstrip(';')+';console.log(JSON.stringify(DICT))'
try:
    oldd=json.loads(subprocess.check_output(['node','-e',js],text=True))
except Exception as e:
    print('old parse fail',e); oldd={}
exact=dict(oldd); pfx={}
for f in sorted(glob.glob('dev/i18n/p*.txt')):
    for ln in open(f,encoding='utf8'):
        ln=ln.rstrip('\n')
        if not ln.strip(): continue
        p=ln.split('¦')
        if len(p)!=11: print('BAD',f,ln[:50]); continue
        raw=p[0]; vals=p[1:]
        if raw!=raw.strip() or raw.endswith('(') :
            pfx[raw]=vals
        else: exact[raw]=[v.strip() if False else v for v in vals]
# prefix keys sorted longest first
pl=sorted(pfx.items(),key=lambda kv:-len(kv[0]))
out='  var DICT = '+json.dumps(exact,ensure_ascii=False,indent=0).replace('\n','')+';\n'
out=out.replace('], "','],\n    "')
out+='  var PFX = '+json.dumps(pl,ensure_ascii=False).replace('], ["','],\n    ["')+';\n'
s=s[:a]+out+s[b:]
open('index.html','w',encoding='utf8').write(s)
print(len(exact),len(pl))
