--- @since 26.9.1

local M = {}

local KEYS, CANDS = {}, {}
for c = 33, 126 do
	KEYS[#KEYS + 1] = string.char(c)
end
for _, k in ipairs({ " ", "<Backspace>", "<Enter>", "<Esc>" }) do
	KEYS[#KEYS + 1] = k
end
for i, k in ipairs(KEYS) do
	CANDS[i] = { on = k == " " and "<Space>" or k }
end

local function styles(opts)
	local main, alt = th.mode.normal_main, th.mode.normal_alt
	return {
		dim = ui.Style():fg(opts.dim),
		hovered = ui.Style():fg(opts.dim):bg(opts.hovered_bg or alt:bg() or "#1f2430"),
		match = ui.Style():fg(opts.match_fg):underline(),
		label = ui.Style()
			:fg(opts.label_fg or main:fg() or "#0b0e14")
			:bg(opts.label_bg or main:bg() or "#d2a6ff")
			:bold(),
	}
end

local start = ya.sync(function(st)
	st.active, st.matches, st.styles = true, {}, styles(st.opts)
	ui.render()
end)

local stop = ya.sync(function(st)
	st.active, st.matches = false, {}
	ui.render()
end)

local update = ya.sync(function(st, query)
	local folder = cx.active.current
	local cursor = folder.cursor
	local smart = query == query:lower()
	local needle = smart and query:lower() or query

	local matches, order, taken = {}, {}, {}
	for _, f in ipairs(query == "" and {} or folder.window) do
		local hay = smart and f.name:lower() or f.name
		local ranges, init = {}, 1
		while true do
			local s, e = hay:find(needle, init, true)
			if not s then
				break
			end
			ranges[#ranges + 1] = { s - 1, e }
			taken[hay:sub(e + 1, e + 1):lower()] = true
			init = e + 1
		end

		if #ranges > 0 then
			local idx = f.idx - 1
			matches[idx], order[#order + 1] = { ranges = ranges }, idx
		end
	end

	table.sort(order, function(a, b)
		local da, db = math.abs(a - cursor), math.abs(b - cursor)
		if da ~= db then
			return da < db
		end
		return a > b
	end)

	-- Labels that could continue the query would be ambiguous, so skip them
	local labels, n = {}, 0
	for c in st.opts.labels:gmatch(".") do
		if not taken[c] and order[n + 1] then
			n = n + 1
			matches[order[n]].label, labels[c] = c, order[n]
		end
	end

	st.matches = matches
	ui.render()
	return { labels = labels, first = order[1] == cursor and order[2] or order[1] }
end)

local jump = ya.sync(function(_, idx)
	local step = idx - cx.active.current.cursor
	if step ~= 0 then
		ya.emit("arrow", { step })
	end
end)

function M:setup(opts)
	local st = self
	opts = opts or {}
	st.opts = {
		labels = opts.labels or "asdfghjklqwertyuiopzxcvbnm",
		icon = opts.icon or "\u{f0e7}",
		dim = opts.dim or "#565b66",
		match_fg = opts.match_fg or "reset",
		hovered_bg = opts.hovered_bg,
		label_fg = opts.label_fg,
		label_bg = opts.label_bg,
	}

	local function flashing(file)
		return st.active and file.in_current
	end
	local function label(file)
		local m = st.matches[file.idx - 1]
		return m and m.label
	end

	local padding, icon, highlights, style = Entity.padding, Entity.icon, Entity.highlights, Entity.style

	-- The label takes the place of the padding, icon, and trailing space so names don't shift
	function Entity:padding()
		if flashing(self._file) and label(self._file) then
			return ""
		end
		return padding(self)
	end

	function Entity:icon()
		if not flashing(self._file) then
			return icon(self)
		end

		local l = label(self._file)
		if l then
			return ui.Span(" " .. l .. " "):style(st.styles.label)
		end

		local i = th.icon:match(self._file, { hovered = self._file.is_hovered })
		return i and i.text .. " " or ""
	end

	function Entity:highlights()
		if not flashing(self._file) then
			return highlights(self)
		end

		local name, p = self._file.name, ui.printable
		local m = st.matches[self._file.idx - 1]
		if not m then
			return p(name)
		end

		local spans, last = {}, 0
		for _, r in ipairs(m.ranges) do
			if r[1] > last then
				spans[#spans + 1] = p(name:sub(last + 1, r[1]))
			end
			spans[#spans + 1] = ui.Span(p(name:sub(r[1] + 1, r[2]))):style(st.styles.match)
			last = r[2]
		end
		if last < #name then
			spans[#spans + 1] = p(name:sub(last + 1))
		end
		return ui.Line(spans)
	end

	function Entity:style()
		if not flashing(self._file) then
			return style(self)
		end
		return self._file.is_hovered and st.styles.hovered or st.styles.dim
	end

	local linemode = Linemode.redraw
	function Linemode:redraw()
		if not flashing(self._file) then
			return linemode(self)
		end

		local lines = {}
		for _, c in ipairs(self._children) do
			local line = ui.Line((type(c[1]) == "string" and self[c[1]] or c[1])(self))
			-- The padding is the hovered bar's end cap and must keep its own color
			if c[1] ~= "padding" then
				line:map(function(s)
					return s:style(st.styles.dim)
				end)
			end
			lines[#lines + 1] = line
		end
		return ui.Line(lines)
	end

	local mode = Status.mode
	function Status:mode()
		if not st.active then
			return mode(self)
		end

		-- Padded to the width of " NOR " so the rest of the status bar has no layout shift
		local s = self:style()
		return ui.Line({
			ui.Span(th.status.sep_left.open):fg(s.main:bg()):bg(App.bg()),
			ui.Span("  " .. st.opts.icon .. "  "):style(s.main),
			ui.Span(th.status.sep_left.close):fg(s.main:bg()):bg(s.alt:bg()),
		})
	end
end

function M:entry()
	start()

	local query, state, target = "", { labels = {} }, nil
	while true do
		local i = ya.which({ cands = CANDS, silent = true })
		local key = i and KEYS[i]
		if not key or key == "<Esc>" then
			break
		elseif key == "<Enter>" then
			target = state.first
			break
		elseif key == "<Backspace>" then
			if query == "" then
				break
			end
			query = query:sub(1, -2)
		elseif state.labels[key] then
			target = state.labels[key]
			break
		else
			query = query .. key
		end
		state = update(query)
	end

	stop()
	if target then
		jump(target)
	end
end

return M
