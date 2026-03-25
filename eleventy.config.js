module.exports = function(eleventyConfig) {
  // Copiar archivos estáticos tal cual al output
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("sinpresito.js");
  eleventyConfig.addPassthroughCopy("firebase-auth.js");
  eleventyConfig.addPassthroughCopy("editor.js");
  eleventyConfig.addPassthroughCopy("cloudflare-worker.js");
  eleventyConfig.addPassthroughCopy("favicon.ico");
  eleventyConfig.addPassthroughCopy("favicon.png");
  eleventyConfig.addPassthroughCopy("logos");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("firestore.rules");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("_data");

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    // Usar Nunjucks como motor de templates
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
