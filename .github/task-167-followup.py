from pathlib import Path

path = Path('docs/engineering/package-guidelines.md')
text = path.read_text()
replacements = {
    '- **OP-009** — Service-facing Operation handler provisioning MUST be exposed through a dedicated Nest-agnostic package entrypoint such as `@accounterbro/<package>/execution`, not by requiring the service to deep-import concrete handlers.': '- **OP-009** — Operation handler provisioning data MUST be owned by a dedicated Nest-agnostic package entrypoint such as `@accounterbro/<package>/execution`, not exposed through concrete handler deep imports. Standard hosting consumes this data through the package `/runtime` manifest rather than importing `/execution` directly in the service.',
    '- **OP-011** — Operation handler provider descriptors MUST inject package-owned runtime ports/contracts and construct concrete handlers inside the package. A hosting service MUST NOT recreate handler constructors or duplicate their dependency knowledge.': '- **OP-011** — Operation handler provider descriptors MUST inject package-owned runtime ports/contracts and construct concrete handlers inside the package. The runtime manifest/hosting adapter MUST reuse those descriptors; a hosting service MUST NOT recreate handler constructors or duplicate their dependency knowledge.',
    '- **READ-008** — Service-facing Read handler provisioning MUST be exposed through the package\'s Nest-agnostic `/execution` entrypoint rather than requiring the service to deep-import concrete handlers.': '- **READ-008** — Read handler provisioning data MUST be owned by the package\'s Nest-agnostic `/execution` entrypoint rather than exposed through concrete handler deep imports. Standard hosting consumes this data through the package `/runtime` manifest rather than importing `/execution` directly in the service.',
    '- **READ-010** — Read handler provider descriptors MUST inject package-owned runtime ports/contracts and construct concrete handlers inside the package. A hosting service MUST NOT recreate handler constructors or duplicate their dependency knowledge.': '- **READ-010** — Read handler provider descriptors MUST inject package-owned runtime ports/contracts and construct concrete handlers inside the package. The runtime manifest/hosting adapter MUST reuse those descriptors; a hosting service MUST NOT recreate handler constructors or duplicate their dependency knowledge.',
}
for old, new in replacements.items():
    if old not in text:
        raise RuntimeError(f'Expected rule not found: {old}')
    text = text.replace(old, new, 1)
path.write_text(text)
