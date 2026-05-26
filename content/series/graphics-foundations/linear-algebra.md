# Linear Algebra Review

Computer graphics uses linear algebra as its working language. Points, directions,
frames, projections, and camera motion can all be expressed with vectors and matrices.

## Vectors

A vector stores magnitude and direction. The dot product measures alignment:

$$
a \cdot b = \|a\| \|b\| \cos \theta
$$

The cross product produces a direction perpendicular to two input directions:

$$
a \times b =
\begin{bmatrix}
a_y b_z - a_z b_y \\
a_z b_x - a_x b_z \\
a_x b_y - a_y b_x
\end{bmatrix}.
$$

## Matrices and transformations

Affine transformations are usually represented with homogeneous coordinates:

$$
\begin{bmatrix}
x' \\
y' \\
z' \\
1
\end{bmatrix}
=
\begin{bmatrix}
R & t \\
0 & 1
\end{bmatrix}
\begin{bmatrix}
x \\
y \\
z \\
1
\end{bmatrix}.
$$

- Translation moves a point.
- Rotation changes orientation while preserving length.
- Scaling changes distances along one or more axes.
- Projection maps 3D geometry to an image plane.

```txt
model space -> world space -> view space -> clip space -> screen space
```
