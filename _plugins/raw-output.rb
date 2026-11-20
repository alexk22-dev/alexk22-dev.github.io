# Pages with `raw_output: true` keep exactly the HTML their Liquid produced.
#
# jekyll-link-attributes and jemoji re-serialize every page through Nokogiri's
# HTML4 parser, which reflows markup and can rewrite inline scripts. :high
# hooks run first and :low hooks last, so the output is saved before those
# plugins and put back after them. (jekyll-minifier runs at write time; see its
# exclude list in _config.yml.)

Jekyll::Hooks.register :pages, :post_render, priority: :high do |page|
  page.instance_variable_set(:@raw_output, page.output) if page.data['raw_output']
end

Jekyll::Hooks.register :pages, :post_render, priority: :low do |page|
  page.output = page.instance_variable_get(:@raw_output) if page.data['raw_output']
end
