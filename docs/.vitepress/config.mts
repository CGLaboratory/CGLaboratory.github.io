import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-US',
  title: 'Computer Graphics Laboratory',
  description: 'Learning notes, algorithms, and resources',
  base: '/learn/',
  outDir: '../dist/learn',
  cleanUrls: true,
  head: [['link', { rel: 'icon', href: '/learn/favicon.ico' }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Docs Home', link: '/' },
      { text: 'Series', link: '/series/' },
      { text: 'Papers', link: '/papers/' },
      { text: 'Contribute', link: '/contribute' },
      { text: 'Main Site', link: 'https://cglab.top/' },
      { text: 'Blog', link: 'https://blog.cglab.top/' }
    ],
    sidebar: {
      '/series/': [
        {
          text: 'Series',
          items: [
            { text: 'Overview', link: '/series/' },
            { text: 'Computer Graphics Foundations', link: '/series/graphics-foundations/' },
            { text: 'Rendering Equation Notes', link: '/series/rendering-equation/' },
            { text: 'Geometry Processing', link: '/series/geometry-processing/' }
          ]
        }
      ],
      '/series/graphics-foundations/': [
        {
          text: 'Computer Graphics Foundations',
          items: [
            { text: 'Overview', link: '/series/graphics-foundations/' },
            { text: 'Rasterization Primer', link: '/series/graphics-foundations/rasterization' },
            { text: 'Linear Algebra Review', link: '/series/graphics-foundations/linear-algebra' }
          ]
        }
      ],
      '/papers/': [
        {
          text: 'Papers',
          items: [{ text: 'Paper Reading Notes', link: '/papers/' }]
        }
      ]
    },
    outline: {
      level: [2, 3]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/CGLaboratory' }
    ]
  }
})
