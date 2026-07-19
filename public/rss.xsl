<?xml version="1.0" encoding="UTF-8"?>
<!--
  Turns the RSS feed into a readable page when a person opens /rss.xml in a
  browser. Feed readers parse the XML underneath and never see any of this.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title><xsl:value-of select="/rss/channel/title" /> — Feed</title>
        <style>
          :root {
            --bg: #0c0c0c; --surface: #131313; --fg: #fff;
            --muted: #9a9a9a; --border: #262626; --primary: #ff5733;
          }
          @media (prefers-color-scheme: light) {
            :root {
              --bg: #f6f5f1; --surface: #fffefb; --fg: #1a1917;
              --muted: #6a6862; --border: #ddd9cf; --primary: #d93a17;
            }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0; background: var(--bg); color: var(--fg);
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
            line-height: 1.6; -webkit-font-smoothing: antialiased;
          }
          .wrap { max-width: 46rem; margin: 0 auto; padding: 4rem 1.5rem 6rem; }
          .badge {
            display: inline-block; font-size: .7rem; font-weight: 800;
            letter-spacing: .18em; text-transform: uppercase;
            color: var(--primary); margin-bottom: .9rem;
          }
          h1 { font-size: 2.4rem; line-height: 1.1; margin: 0 0 .6rem; letter-spacing: -.02em; }
          .lede { color: var(--muted); margin: 0 0 2rem; }
          .note {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 14px; padding: 1.1rem 1.25rem; margin-bottom: 2.5rem;
            font-size: .92rem; color: var(--muted);
          }
          .note strong { color: var(--fg); }
          .note code {
            background: var(--bg); border: 1px solid var(--border);
            padding: .12em .45em; border-radius: 6px; font-size: .88em;
            word-break: break-all;
          }
          h2 {
            font-size: .72rem; letter-spacing: .18em; text-transform: uppercase;
            color: var(--muted); margin: 0 0 1.1rem; font-weight: 800;
          }
          .item {
            display: block; text-decoration: none; color: inherit;
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 16px; padding: 1.25rem 1.4rem; margin-bottom: .9rem;
            transition: border-color .2s ease, transform .2s ease;
          }
          .item:hover { border-color: var(--primary); transform: translateY(-2px); }
          .item h3 { margin: 0 0 .4rem; font-size: 1.12rem; line-height: 1.35; }
          .item p { margin: 0 0 .7rem; color: var(--muted); font-size: .93rem; }
          .meta { font-size: .78rem; color: var(--muted); }
          .home {
            display: inline-block; margin-top: 2rem; color: var(--primary);
            text-decoration: none; font-weight: 700;
          }
          .home:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <p class="badge">RSS Feed</p>
          <h1><xsl:value-of select="/rss/channel/title" /></h1>
          <p class="lede"><xsl:value-of select="/rss/channel/description" /></p>

          <div class="note">
            <strong>What is this page?</strong> It is a feed — a list of articles that apps
            can follow automatically. Paste this address into a reader such as Feedly or
            Inoreader and new articles arrive on their own, with no email and no account.
            <br /><br />
            <code><xsl:value-of select="/rss/channel/link" />rss.xml</code>
          </div>

          <h2>Latest articles</h2>
          <xsl:for-each select="/rss/channel/item">
            <a class="item" href="{link}">
              <h3><xsl:value-of select="title" /></h3>
              <p><xsl:value-of select="description" /></p>
              <span class="meta">
                <xsl:value-of select="substring(pubDate, 6, 11)" />
                <xsl:if test="category">
                  <xsl:text> · </xsl:text>
                  <xsl:value-of select="category[1]" />
                </xsl:if>
              </span>
            </a>
          </xsl:for-each>

          <a class="home" href="{/rss/channel/link}">← Back to the blog</a>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
