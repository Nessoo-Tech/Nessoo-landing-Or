import re,sys
def parse(css):
    """Return list of (prelude, body) top-level; bodies of @media etc. contain nested css."""
    out=[];i=0;n=len(css)
    while i<n:
        j=css.find('{',i)
        if j<0: break
        pre=css[i:j].strip()
        d=1;k=j+1
        while d and k<n:
            c=css[k]
            if c=='{':d+=1
            elif c=='}':d-=1
            elif c=='"' or c=="'":
                e=css.find(c,k+1); k=e
            k+=1
        out.append((pre,css[j+1:k-1])); i=k
    return out
def selectors(css,ctx=''):
    for pre,body in parse(css):
        if pre.startswith('@media') or pre.startswith('@supports') or pre.startswith('@layer') or pre.startswith('@container'):
            yield from selectors(body,pre)
        elif pre.startswith('@'):
            yield (ctx,pre,body)
        else:
            yield (ctx,pre,body)
