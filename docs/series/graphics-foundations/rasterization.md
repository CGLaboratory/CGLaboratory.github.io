# Rasterization Primer

Rasterization maps geometric primitives from continuous space onto a discrete image grid.
The central question is simple: for each pixel sample, decide whether a primitive covers
that sample and then compute the value that should be written to the framebuffer.

## Pipeline sketch

1. Transform vertices from model space to clip space.
2. Project and divide by $w$ to obtain normalized device coordinates.
3. Convert normalized coordinates into screen-space samples.
4. Test triangle coverage and interpolate attributes.
5. Resolve visibility with a depth buffer.

The perspective projection can be summarized as

$$
p_{clip} = P V M p_{model}
$$

where $M$, $V$, and $P$ are the model, view, and projection matrices.

## Barycentric coordinates

For a triangle with vertices $a$, $b$, and $c$, a point $p$ on the same plane can be
written as

$$
p = \alpha a + \beta b + \gamma c,\quad \alpha + \beta + \gamma = 1.
$$

Inside-triangle tests usually check whether all three barycentric coordinates are
non-negative. The same coordinates also interpolate color, normal, texture coordinate,
and depth.

| Concept | Purpose |
| --- | --- |
| Coverage | Decides whether a sample belongs to a primitive |
| Interpolation | Carries vertex attributes to fragments |
| Depth test | Keeps the closest visible fragment |

```cpp
Color shade(Fragment f) {
    Vec3 n = normalize(f.normal);
    Vec3 l = normalize(light.position - f.position);
    float diffuse = max(dot(n, l), 0.0f);
    return f.albedo * diffuse;
}
```

> A clean rasterizer is a careful agreement between geometry, sampling, and numerical
> convention.
