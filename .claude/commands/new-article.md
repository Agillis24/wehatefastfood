---
description: Scaffold an MDX long-form article with frontmatter and a source block
---

# /new-article <slug>

Create `content/articles/<slug>.mdx`.

Frontmatter: `title`, `description`, `publishedOn`, `updatedOn`, `sources` (at least one), `status`.

## House style

- Lead with the specific, not the thesis. A number, a product, a formulation choice.
- Every claim in the body traces to an entry in the `sources` block. If a sentence cannot be sourced, it is either an opinion — mark it as one — or it is cut.
- Interactive components may be imported inline. Prefer the existing ones over new ones; each new one is bytes on a page with a budget.
- Aim the argument at companies and at regulation. Never at readers, their bodies, or their choices.
- No headline that promises a hazard the body does not support. That is the trade the entire project refuses to make.
