---
id: note_hello_languages
created: "2026-03-21T22:00:00Z"
updated: "2026-03-21T22:00:00Z"
revision: 1
mode: enhanced
---

# Hello World — Language Showcase

Testing syntax highlighting across common languages.

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}
console.log(greet("World"));
```

```javascript
const http = require("http");
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello, World!\n");
}).listen(3000);
```

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("World"))
```

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

```rust
fn main() {
    let name = "World";
    println!("Hello, {}!", name);
}
```

```bash
#!/bin/bash
NAME="World"
echo "Hello, $NAME!"
```

```sql
SELECT 'Hello, ' || name || '!' AS greeting
FROM users
WHERE active = true
ORDER BY name;
```

```html
<!DOCTYPE html>
<html lang="en">
<head><title>Hello</title></head>
<body>
  <h1>Hello, World!</h1>
  <script>document.title = "Loaded";</script>
</body>
</html>
```

```css
.hello {
  color: var(--color-accent);
  font-size: 2rem;
  font-weight: 700;
}
```

```yaml
services:
  api:
    image: hello-api:latest
    ports:
      - "8003:8003"
    environment:
      - GREETING=Hello, World!
```

```json
{
  "greeting": "Hello, World!",
  "languages": ["typescript", "python", "go", "rust"],
  "count": 10
}
```

```docker
FROM denoland/deno:latest
WORKDIR /app
COPY . .
RUN deno cache main.ts
CMD ["deno", "run", "--allow-net", "main.ts"]
```
