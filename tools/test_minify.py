#!/usr/bin/env python3
"""Regression tests for tools/minify.py (stdlib unittest, no dependencies).

Run:  python3 tools/test_minify.py
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import minify  # noqa: E402


def css(text):
    return minify.minify_css(text)


class SelectorSpacing(unittest.TestCase):
    """A space between compound selectors is a descendant combinator: keep it."""

    def test_descendant_pseudo_keeps_space(self):
        self.assertEqual(css(".card :where(p){color:red}"), ".card :where(p){color:red}")

    def test_descendant_pseudo_focus_keeps_space(self):
        self.assertEqual(css(".menu :focus-visible{outline:0}"), ".menu :focus-visible{outline:0}")

    def test_descendant_attribute_keeps_space(self):
        self.assertEqual(css(".a [hidden]{display:none}"), ".a [hidden]{display:none}")

    def test_after_pseudo_call_keeps_space(self):
        self.assertEqual(css(":is(a) :hover{x:y}"), ":is(a) :hover{x:y}")

    def test_child_sibling_combinators_are_compacted(self):
        self.assertEqual(css(".a > .b ~ .c + .d{x:y}"), ".a>.b~.c+.d{x:y}")

    def test_selector_list_compacted(self):
        self.assertEqual(css("a , b{x:y}"), "a,b{x:y}")


class MediaAndSupports(unittest.TestCase):
    """Keyword + parenthesis needs its space: `and(` is not valid CSS."""

    def test_media_and_keeps_space(self):
        self.assertEqual(
            css("@media (min-width: 48rem) and (max-width: 60rem){a{b:c}}"),
            "@media (min-width:48rem) and (max-width:60rem){a{b:c}}",
        )

    def test_media_screen_and_keeps_space(self):
        self.assertEqual(
            css("@media screen and (min-width:1px){a{b:c}}"),
            "@media screen and (min-width:1px){a{b:c}}",
        )

    def test_supports_and_keeps_space(self):
        self.assertEqual(
            css("@supports (position-anchor: --t) and (anchor-scope: --t){a{b:c}}"),
            "@supports (position-anchor:--t) and (anchor-scope:--t){a{b:c}}",
        )

    def test_supports_selector_function_keeps_space(self):
        self.assertEqual(
            css("@supports selector(a::b){x{y:z}}"),
            "@supports selector(a::b){x{y:z}}",
        )


class MathStringsUrls(unittest.TestCase):
    def test_calc_keeps_operator_spaces(self):
        self.assertEqual(css("a{width: calc(100% - 2px)}"), "a{width:calc(100% - 2px)}")

    def test_strings_untouched(self):
        self.assertEqual(css('a{content: "a  :  b"}'), 'a{content:"a  :  b"}')

    def test_url_untouched(self):
        self.assertEqual(css("a{background:url( 'x y.png' )}"), "a{background:url( 'x y.png' )}")

    def test_comments_dropped(self):
        self.assertEqual(css("/* hi */a{b:c}"), "a{b:c}")

    def test_trailing_semicolon_before_brace_removed(self):
        self.assertEqual(css("a{b:c;}"), "a{b:c}")


class ShippedBuild(unittest.TestCase):
    """The checked-in dist must not contain the invalid `)and(` joins."""

    def test_dist_has_no_invalid_and_join(self):
        dist = (Path(minify.ROOT) / "dist" / "linkedui.min.css").read_text(encoding="utf-8")
        self.assertEqual(dist.count(")and("), 0, "invalid `)and(` join found in dist")
        self.assertTrue("@supports (position-anchor:--tab-active) and (anchor-scope:--tab-active)" in dist,
                        "tab anchor @supports block missing or malformed")

    def test_dist_has_no_comments(self):
        # Comments are documentation for src/ only. The shipped CSS carries none,
        # not even /*! legal comments: the minifier drops every comment.
        dist = (Path(minify.ROOT) / "dist" / "linkedui.min.css").read_text(encoding="utf-8")
        self.assertNotIn("/*", dist, "comment marker found in dist")


class NoLegalComments(unittest.TestCase):
    """Even /*! legal comments are dropped, so the build ships no comments at all."""

    def test_legal_comment_dropped(self):
        self.assertEqual(css("a{b:c}/*! license */"), "a{b:c}")


if __name__ == "__main__":
    unittest.main()
