'''Builds every reading page and index from contents.yml.

A reading you have written lives as a real .md file under docs/ and is used as
written. A reading you have not written yet gets a generated 'not yet posted'
page, so the map of each text stays complete and no link is ever dead.

Nothing in here needs editing to add readings; edit contents.yml instead.
'''

import os
import yaml
from mkdocs.structure.files import File

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load():
    with open(os.path.join(_ROOT, 'contents.yml'), encoding='utf8') as fh:
        return yaml.safe_load(fh)['texts']


def _uri(text, div, n):
    unit = text['unit'].lower()
    return text['slug'] + '/' + div['slug'] + '/' + unit + '-' + str(n).zfill(2) + '.md'


def _total(text):
    return sum(d['to'] - d['from'] + 1 for d in text['divisions'])


def on_files(files, config):
    docs_dir = config['docs_dir']
    existing = set(f.src_uri for f in files)
    add = []

    def generate(src_uri, lines):
        if src_uri in existing:
            return
        add.append(File.generated(config, src_uri, content='\n'.join(lines)))

    def posted(src_uri):
        return os.path.exists(os.path.join(docs_dir, src_uri))

    texts = _load()

    home = ['# Sikh Literature', '']
    for text in texts:
        home.append('## [' + text['title'] + '](' + text['slug'] + '/index.md)')
        home.append('')
        if text.get('subtitle'):
            home.append('*' + text['subtitle'] + '*')
            home.append('')
        n_posted = 0
        for div in text['divisions']:
            for n in range(div['from'], div['to'] + 1):
                if posted(_uri(text, div, n)):
                    n_posted += 1
        home.append(str(n_posted) + ' of ' + str(_total(text)) + ' posted.')
        home.append('')
    generate('index.md', home)

    for text in texts:
        unit = text['unit']
        slug = unit.lower()

        index = ['# ' + text['title'], '']
        if text.get('subtitle'):
            index += ['*' + text['subtitle'] + '*', '']

        for div in text['divisions']:
            index += ['## ' + div['title'], '']
            division = ['# ' + text['title'] + ' &middot; ' + div['title'], '']

            for n in range(div['from'], div['to'] + 1):
                uri = _uri(text, div, n)
                name = unit + ' ' + str(n)
                leaf = slug + '-' + str(n).zfill(2) + '.md'
                if posted(uri):
                    index.append('- [' + name + '](' + div['slug'] + '/' + leaf + ')')
                    division.append('- [' + name + '](' + leaf + ')')
                else:
                    index.append('- ' + name + ' &middot; *not yet posted*')
                    division.append('- ' + name + ' &middot; *not yet posted*')
                    generate(uri, [
                        '# ' + div['title'] + ', ' + name,
                        '',
                        'Not yet posted.',
                        '',
                        'To post it, add this file to the repository:',
                        '',
                        '```',
                        'web/docs/' + uri,
                        '```',
                        '',
                        '[All of ' + text['title'] + '](../index.md)',
                    ])
            index.append('')
            generate(text['slug'] + '/' + div['slug'] + '/index.md', division)

        generate(text['slug'] + '/index.md', index)

    for f in add:
        files.append(f)
    return files


def on_nav(nav, config, files):
    '''Name each section from contents.yml rather than from its folder name,
    so the sidebar reads 'Bhagat Mala', not 'Bhagat mala'.'''
    titles = {}
    for text in _load():
        titles[text['slug']] = text['title']
        for div in text['divisions']:
            titles[div['slug']] = div['title']

    def walk(items):
        for item in items:
            children = getattr(item, 'children', None)
            if children:
                key = str(item.title).lower().replace(' ', '-')
                if key in titles:
                    item.title = titles[key]
                walk(children)

    walk(nav.items)
    return nav
