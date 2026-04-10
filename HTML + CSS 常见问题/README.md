1. 什么是重绘，什么是回流？如何减少回流？
2. 以下代码触发了多少次回流？
3. Margin 塌陷问题如何解决？BFC 是什么？怎么触发？
4. 如何隐藏一个元素？
5. overflow 不同值的区别
6. 三栏布局的实现方式（圣杯模型）
7. calc() 方法
8. 实现一个固定长宽 div 在屏幕上垂直水平居中
9. 渐进增强（progressive enhancement）和优雅降级（graceful degradation）
10. iframe 有哪些优缺点及使用场景？
11. CSS 盒子模型
12. HTML5 的特性
13. CSS3 的特性
14. CSS 中选择器的优先级，权重计算方式
15. HTML5 input 元素 type 属性
16. CSS 中属性的继承性
17. 画一条 0.5px 的线
18. position 的值
19. 什么是浮动，浮动会引起什么问题，有何解决方案？
20. line-height 和 height 的区别
21. 设置一个元素的背景颜色会填充的区域
22. inline-block、inline 和 block 的区别
23. 为什么 img 是 inline 但是可以设置宽高？
24. box-sizing 的作用，如何使用？
25. CSS 实现动画有哪些方式？
26. transition 和 animation 的区别？
27. 如何实现在某个容器中居中的？

``` CSS
/* 方式一：Grid 布局居中 */
.container {
    display: grid;
    place-items: center;
    width: 100vw;
    height: 100vh;
}

/* 方式二：绝对定位居中 */
.container {
    position: relative;
    width: 100vw;
    height: 100vh;
}

.centered-element {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
```

28. 如何改变一个 DOM 元素的字体颜色？
29. 相对布局和绝对布局，position:relative 和 absolute
30. 弹性盒子 flex 布局
31. Less 和 SCSS 的区别
32. CSS3伪类，伪元素
33. ::before 和 ::after 中双冒号和单冒号的区别
34. 响应式布局的实现方案
35. link 标签和 import 标签的区别？
36. 块元素、行元素、置换元素的区别
37. 单行元素的文本省略号实现方式
38. HTML 语义化标签 
39. px，rpx，vw，vh，rem，em 的区别
- px（像素）：
    - 相对单位，代表屏幕上的一个基本单位，逻辑像素
    - 不会根据屏幕尺寸或分辨率自动调整大小
    - 在高分辨率屏幕上可能显得很小
- rpx（微信小程序单位）：
    - 相对单位，代表微信小程序中的一个基本单位
    - 会根据屏幕尺寸或分辨率自动调整大小
    - 在高分辨率屏幕上可能显得很大
- vw（视口宽度）：
    - 相对单位，代表视口宽度的 1%
    - 会根据视口宽度自动调整大小
    - 在高分辨率屏幕上可能显得很大
- vh（视口高度）：
    - 相对单位，代表视口高度的 1%
    - 会根据屏幕尺寸或分辨率自动调整大小
    - 在高分辨率屏幕上可能显得很大
- rem（相对根元素字体大小）：
    - 相对单位，代表根元素字体大小的 1%
    - 会根据根元素字体大小自动调整大小
    - 在高分辨率屏幕上可能显得很大
- em（相对父元素字体大小）：
    - 相对单位，代表父元素字体大小的 1%
    - 会根据父元素字体大小自动调整大小
    - 在高分辨率屏幕上可能显得很大