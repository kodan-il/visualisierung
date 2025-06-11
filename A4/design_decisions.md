### your design
We used Set Membership Tree for the Set visualization, and we used a word cloud for the Text and Document visualization.
The word cloud shows the 15 most frequent of each movie description within a genre. We have left out those words, that belonged to the 100 most frequent words
in 75% of the genres (words like "in", "of", "and", ...) to actually get genre typical words instead of only the most frequent ones.

### your justification
We use this visualization, the Set membership tree, for it's simplicity in identify the amount of combination of each genre. We also able to know the movie distribution in each combination. this visualization enable a overall understanding, as well as the cardinality of the genre and the frequency of each combination. For the interaction, for every genre that we clicked, the words inside the wordcloud will change according to the text, or words that correlate with the genre.
The marks of the bar chart are lines, the channels are length of the bars (number) and spatial region (genre combination number).
The marks of the tree part of the set-membership tree are lines (or curves) that connect the number of genre combinations with the actual genres. 
The channels in this part of the visualization are spatial region of each curve ending, the width of the lines indicating the number of movies, and the color of the lines indicating the genre they lead to.
This visualization helps to discover the distribution of how many genres are typically combined as well as which genres are typically combined with each others.

The word cloud visualization is a visually pleasing kind of a distant reading technique that gives an overview on word frequencies of texts.
The marks of this visualization are the written words (letters) and the channels are text size (showing the word frequency) and the text color (showing the genre the visualization belongs to).

Our third visualization is a simple scatter plot that shows the movies 2D embeddings. 
The marks are the points and the channels are the x- and the y-position of the points.
This visualizations also helps discovering similarities and differences between the genres, in this case regarding their word embeddings.

By clicking on the different labels of the set visualization you can interact with the visualizations and enable filtering in the set visualization and in the embedding scatter plot as well.