import markdown
import webapp2


HEADER="""
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Docs</title>
            <style>
                code {
                    background-color: #F0F0F0;
                    border: solid 1px #C0C0C0;
                    border-radius: 3px;
                    padding: 3px;
                    line-height: 2;
                }

                h2 {
                    border-bottom: solid 1px #000000
                }
            </style>
        </head>
        <body>
"""

FOOTER="""
        </body>
    </html>
"""


class DocsHandler(webapp2.RequestHandler):
    def get(self, path):
        if not path:
            # default path
            path = 'README.md'

        try:
            f = open(path)

        except IOError:
            self.abort(404)
            return

        markdown_content = f.read()

        md = markdown.Markdown(extensions=['meta'])
        html_content = md.convert(markdown_content)

        self.response.write(HEADER)
        self.response.write(html_content)
        self.response.write(FOOTER)


app = webapp2.WSGIApplication([
    webapp2.Route(r'/docs<:/?><path:([\w/]+\.md)?>', handler=DocsHandler),
], debug=True)
