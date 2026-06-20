return {
  "Pocco81/auto-save.nvim",
  opts = {
    condition = function(buf)
      local fn = vim.fn
      local utils = require("auto-save.utils.data")

      local filetype = fn.getbufvar(buf, "&filetype")
      local buftype = fn.getbufvar(buf, "&buftype")

      if filetype == "harpoon" then
        return false
      end

      -- Only autosave normal file buffers.
      if buftype ~= "" then
        return false
      end

      return fn.getbufvar(buf, "&modifiable") == 1 and utils.not_in(filetype, {})
    end,
  },
  keys = {
    {
      "<leader>N",
      ":ASToggle<CR>",
      desc = "Toggle Auto Save",
    },
  },
}
