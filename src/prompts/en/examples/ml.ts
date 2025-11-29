export const mlExamples = [
    {
        "inputTags": [
            "#machine-learning",
            "#research",
            "#data-science",
            "#big-data",
            "#statistics",
            "#predictive-modeling",
            "#AI",
        ],
        "document": `April 3, 2024

Experiment ID: ML-478
Model Training Results - Day 3

Training metrics show unexpected behavior in the validation loss. The loss curve started oscillating after epoch 150, possibly indicating:
1. Learning rate might be too high
2. Potential data leakage between train/val sets

Modified hyperparameters:
- Reduced learning rate to 0.0001
- Increased batch size to 64
- Added gradient clipping

Next steps: Run overnight training with new parameters. Check for data preprocessing inconsistencies.`,
        "response": {
            "tags": [
                "#machine-learning",
                "#research",
                "#data-science",
            ],
            "newTags": [
                "#experiment-log",
                "#model-training",
            ],
        }
    },
];
