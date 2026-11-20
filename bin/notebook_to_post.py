#!/usr/bin/env python3

"""Convert a Jupyter notebook into a Jekyll blog post markdown file.

Example:
  python3 bin/notebook_to_post.py assets/jupyter/blog.ipynb --title "My Notebook Post"
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT_DIR / "_posts"
POST_IMAGES_DIR = ROOT_DIR / "assets" / "img" / "posts"


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower())
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug or "notebook-post"


def _yaml_quote(text: str) -> str:
    return "'" + text.replace("'", "''") + "'"


def _normalize_path(input_path: str) -> Path:
    path = Path(input_path).expanduser()
    if not path.is_absolute():
        path = ROOT_DIR / path
    return path.resolve()


def _parse_tags(raw_tags: str) -> list[str]:
    if not raw_tags.strip():
        return []

    tags = [tag.strip() for tag in raw_tags.split(",") if tag.strip()]
    deduped_tags: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        key = tag.lower()
        if key not in seen:
            seen.add(key)
            deduped_tags.append(tag)
    return deduped_tags


def _build_front_matter(
    title: str,
    post_date: str,
    description: str,
    tags: list[str],
    categories: list[str],
) -> str:
    front_matter_lines = [
        "---",
        "layout: post",
        f"title: {_yaml_quote(title)}",
        f"date: {post_date}",
        f"description: {_yaml_quote(description)}",
    ]

    if tags:
        tags_yaml = ", ".join(_yaml_quote(tag) for tag in tags)
        front_matter_lines.append(f"tags: [{tags_yaml}]")

    if categories:
        categories_yaml = ", ".join(_yaml_quote(category) for category in categories)
        front_matter_lines.append(f"categories: [{categories_yaml}]")

    front_matter_lines.append("---")
    front_matter_lines.append("")

    return "\n".join(front_matter_lines)


def convert_notebook(
    notebook_path: Path,
    title: str,
    post_date: str,
    description: str,
    slug: str,
    tags: list[str],
    categories: list[str],
    force: bool,
) -> Path:
    if not notebook_path.exists():
        raise FileNotFoundError(f"Notebook not found: {notebook_path}")

    if notebook_path.suffix.lower() != ".ipynb":
        raise ValueError(f"Expected a .ipynb file, got: {notebook_path.name}")

    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    POST_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    output_post_path = POSTS_DIR / f"{post_date}-{slug}.md"
    if output_post_path.exists() and not force:
        raise FileExistsError(
            f"Post already exists: {output_post_path}\n"
            "Use --force to overwrite."
        )

    with tempfile.TemporaryDirectory(prefix="nb_to_post_") as tmp_dir_raw:
        tmp_dir = Path(tmp_dir_raw)
        tmp_basename = "converted_notebook"

        cmd = [
            "jupyter",
            "nbconvert",
            "--to",
            "markdown",
            str(notebook_path),
            "--output",
            tmp_basename,
            "--output-dir",
            str(tmp_dir),
        ]
        subprocess.run(cmd, check=True)

        converted_md_path = tmp_dir / f"{tmp_basename}.md"
        if not converted_md_path.exists():
            raise RuntimeError("Notebook conversion did not produce markdown output.")

        markdown_body = converted_md_path.read_text(encoding="utf-8")

        resources_src = tmp_dir / f"{tmp_basename}_files"
        if resources_src.exists():
            resources_dst = POST_IMAGES_DIR / slug
            if resources_dst.exists() and force:
                shutil.rmtree(resources_dst)
            elif resources_dst.exists() and not force:
                raise FileExistsError(
                    f"Image directory already exists: {resources_dst}\n"
                    "Use --force to overwrite."
                )

            shutil.copytree(resources_src, resources_dst)
            markdown_body = markdown_body.replace(
                f"{tmp_basename}_files/",
                f"/assets/img/posts/{slug}/",
            )

        front_matter = _build_front_matter(title, post_date, description, tags, categories)
        output_post_path.write_text(front_matter + markdown_body, encoding="utf-8")

    return output_post_path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert a Jupyter notebook (.ipynb) to a Jekyll post in _posts/."
    )
    parser.add_argument("notebook", help="Path to notebook file (e.g., assets/jupyter/blog.ipynb)")
    parser.add_argument("--title", help="Post title (default: derived from notebook filename)")
    parser.add_argument(
        "--date",
        default=date.today().isoformat(),
        help="Post date in YYYY-MM-DD format (default: today)",
    )
    parser.add_argument(
        "--slug",
        help="URL slug used in filename and image folder (default: derived from title)",
    )
    parser.add_argument(
        "--description",
        default="Notebook converted to blog post.",
        help="Post description for front matter",
    )
    parser.add_argument(
        "--tags",
        default="notebook",
        help="Comma-separated tags (default: notebook)",
    )
    parser.add_argument(
        "--categories",
        default="",
        help="Comma-separated categories",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing post/image output if present",
    )

    args = parser.parse_args()

    notebook_path = _normalize_path(args.notebook)
    title = args.title.strip() if args.title else notebook_path.stem.replace("_", " ").replace("-", " ").title()
    slug = _slugify(args.slug if args.slug else title)
    tags = _parse_tags(args.tags)
    categories = _parse_tags(args.categories)

    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        print("Error: --date must be in YYYY-MM-DD format.", file=sys.stderr)
        return 1

    try:
        output_path = convert_notebook(
            notebook_path=notebook_path,
            title=title,
            post_date=args.date,
            description=args.description,
            slug=slug,
            tags=tags,
            categories=categories,
            force=args.force,
        )
    except FileNotFoundError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    except FileExistsError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(
            "Error: notebook conversion failed. Ensure Jupyter is installed and accessible.",
            file=sys.stderr,
        )
        print(str(error), file=sys.stderr)
        return 1
    except Exception as error:  # noqa: BLE001
        print(f"Unexpected error: {error}", file=sys.stderr)
        return 1

    print(f"✅ Created post: {output_path.relative_to(ROOT_DIR)}")
    print("Tip: review the generated markdown and front matter before publishing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())