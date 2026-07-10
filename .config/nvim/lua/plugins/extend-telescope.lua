return {
  "nvim-telescope/telescope.nvim",
  opts = function(_, opts)
    local actions = require("telescope.actions")
    local action_state = require("telescope.actions.state")

    local function copy_relative_path(prompt_bufnr)
      local picker = action_state.get_current_picker(prompt_bufnr)
      local entry = action_state.get_selected_entry()

      if not entry then
        return
      end

      local path = entry.path or entry.filename or entry.value or entry[1]

      if not path then
        return
      end

      local cwd = picker.cwd or vim.fn.getcwd()

      local relative_path = path

      if vim.fn.fnamemodify(path, ":p") == path then
        relative_path = vim.fs.relpath(cwd, path) or path
      end

      vim.fn.setreg("+", relative_path)
      vim.notify("Copied: " .. relative_path)
    end

    local function insert_relative_path(prompt_bufnr)
      local picker = action_state.get_current_picker(prompt_bufnr)
      local entry = action_state.get_selected_entry()

      if not entry then
        return
      end

      local path = entry.path or entry.filename or entry.value or entry[1]
      local cwd = picker.cwd or vim.fn.getcwd()

      if vim.fn.fnamemodify(path, ":p") == path then
        path = vim.fs.relpath(cwd, path) or path
      end

      actions.close(prompt_bufnr)
      vim.api.nvim_put({ path }, "c", true, true)
    end

    opts.defaults = opts.defaults or {}
    local mappings = opts.defaults.mappings or {}
    opts.defaults.mappings = mappings

    mappings.i = mappings.i or {}
    mappings.n = mappings.n or {}

    mappings.i["<C-y>"] = copy_relative_path
    mappings.n["<C-y>"] = copy_relative_path
    mappings.i["<C-i>"] = insert_relative_path
    mappings.n["<C-i>"] = insert_relative_path

    return opts
  end,
}
