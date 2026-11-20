# The homepage (_pages/cool-home.html) loads the data that scripts/build_cool.py builds from _cool/.
# Stop the build when that step was skipped, instead of shipping a homepage that can't load its data.
Jekyll::Hooks.register :site, :post_read do |site|
  url = site.data.dig("cool", "work_json")
  json = File.join(site.source, "assets", "cool", "data", "work.json")
  next if url && File.file?(json)
  raise Jekyll::Errors::FatalException,
        "The homepage data is missing: run `python3 scripts/build_cool.py` before `jekyll build` " \
        "(it builds assets/cool/data/work.json and _data/cool.json from _cool/)."
end
