from django.db import models
from user_app.models import User
from cloudinary.models import CloudinaryField


class Hashtag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    caption = models.TextField()
    file = CloudinaryField('file', resource_type='auto')
    hashtags = models.ManyToManyField(Hashtag, blank=True, related_name="hashtags_posts")
    mentions = models.ManyToManyField(User, blank=True, related_name="mentioned_posts")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Post by {self.user.username}, caption:: {self.caption} at {self.created_at}"


class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "post")

    def __str__(self):
        return f"{self.user.username} liked {self.post.id}"


class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey("Post", on_delete=models.CASCADE)  
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.username} on {self.post.id}"

class CommentReply(models.Model):
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="replies")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reply by {self.user.username} on comment {self.comment.id}"
    


class SavedPost(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_posts")
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    saved_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('post', 'user')

    def __str__(self):
        return f"{self.user.username} saved {self.post.id}"

class ArchivedPost(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="archived_posts")
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    archived_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} archived {self.post.id}"
