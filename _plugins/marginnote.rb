# Margin notes: pull a display equation (or any short aside) into the right
# margin of a post, Tufte-style.
#
#   {% marginnote %}
#   $$ \frac{a}{{b + c}} $$
#   {% endmarginnote %}
#
# This subclasses Liquid::Raw rather than Liquid::Block on purpose. A plain
# Liquid::Block re-parses its body as Liquid, so `{{` and `{%` inside LaTeX
# (e.g. nested braces in \frac{a}{{b}}) would be eaten as Liquid syntax before
# the markdown converter ever sees them. Liquid::Raw captures the body verbatim
# at parse time, so equations survive intact. An {% include %} cannot do this:
# its body arrives as a string argument that Liquid has already parsed.
#
# The float is applied by CSS only under `.container.margin-math` on wide
# viewports (see _sass/_blog.scss). Everywhere else — flag off, TOC occupying
# the right column, or narrow screens — this renders as an ordinary centered
# display equation, which is also exactly what you get if you delete the tag.
module Jekyll
  module Tags
    class MarginNoteTag < Liquid::Raw
      def render(context)
        site = context.registers[:site]
        converter = site.find_converter_instance(::Jekyll::Converters::Markdown)
        "<aside class=\"marginnote\">#{converter.convert(@body)}</aside>"
      end

      # Liquid::Raw overrides render_to_output_buffer to emit @body untouched,
      # so overriding render alone would have no effect.
      def render_to_output_buffer(context, output)
        output << render(context)
        output
      end
    end
  end
end

Liquid::Template.register_tag('marginnote', Jekyll::Tags::MarginNoteTag)
