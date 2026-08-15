return {
  {
    "Shatur/neovim-ayu",
    config = function()
      local colors = require("ayu.colors")
      colors.generate(false)

      require("ayu").setup({
        mirage = false,
        terminal = false,
        overrides = {
          LineNr = { fg = colors.fg_idle },
        },
      })
    end,
  },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "ayu",
    },
  },
}
