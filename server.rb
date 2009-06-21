require 'rubygems'
require 'sinatra'
require 'haml'

set :public, File.dirname(__FILE__)

get '/' do
  haml :index
end

get '/data' do
  start = params[:start].to_i
  count = params[:count].to_i
  
  @data = (start...(start+count)).to_a
  
  haml :data
end

helpers do
  def script(src = nil, &block)
    haml_tag('script', { :type => 'text/javascript', :src => src }, &block)
  end
  
  def stylesheet(href, options = {})
    haml_tag('link', options.merge({ :rel => 'stylesheet', :type => 'text/css', :href => href}))
  end
end

use_in_file_templates!

__END__

@@ layout

%html
  %head
    = script '/prototype.js'
    = script '/pageless_browser.js'
    = stylesheet '/styles.css'
  %body
    = yield

@@ index

#container

= script do
  new PagelessBrowser('container', 1000, {url: '/data'})

@@ data

- for item in @data
  .item= item
