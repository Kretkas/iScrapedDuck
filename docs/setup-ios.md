# iPhone setup with Scriptable

1. Install Scriptable from the App Store.
2. Open Scriptable.
3. Tap `+`.
4. Name the script `RaidHundoCP`.
5. Paste the contents of `scriptable/RaidHundoCP.js`.
6. In `CONFIG.DATA_URL`, set your fork raw URL:

   ```text
   https://raw.githubusercontent.com/Kretkas/iScrapedDuck/data/raids.json
   ```

7. Run the script inside Scriptable.
8. Check the preview.
9. On the Home Screen, long-press an empty area.
10. Tap `+`.
11. Find Scriptable.
12. Choose Medium or Large widget.
13. Add it.
14. Long-press the widget → `Edit Widget`.
15. Set `Script` to `RaidHundoCP`.

If the phone is offline, the widget uses the last successful cache from:

```text
RaidHundoCP/raids-cache.json
RaidHundoCP/raids-cache-meta.json
```
