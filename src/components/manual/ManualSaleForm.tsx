import { useEffect } from 'react';
import { Button, Card, CardContent, Stack, TextField, Typography, Autocomplete } from '@mui/material';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useInventoryStore } from '../../hooks/useInventoryStore';
import type { ManualSalePayload } from '../../types';

type Props = {
  onSubmitted?: () => void;
};

const defaultValues: ManualSalePayload = {
  lines: [{ dish: '', quantity: 1 }]
};

const ManualSaleForm = ({ onSubmitted }: Props) => {
  const { dishes, fetchDishes } = useInventoryStore();
  const dishOptions = dishes.map((dish) => ({ label: dish.name, value: dish._id }));
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<ManualSalePayload>({
    defaultValues
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines'
  });
  const createSale = useInventoryStore((state) => state.createSale);

  useEffect(() => {
    void fetchDishes();
  }, [fetchDishes]);

  const onSubmit = handleSubmit(async (values) => {
    await createSale(values);
    reset(defaultValues);
    onSubmitted?.();
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Registrar venta manual
        </Typography>
        <Stack spacing={2} component="form" onSubmit={onSubmit}>
          {fields.map((field, index) => (
            <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                control={control}
                name={`lines.${index}.dish`}
                rules={{ required: true }}
                render={({ field: dishField }) => (
                  <Autocomplete
                    sx={{ minWidth: 240 }}
                    options={dishOptions}
                    value={dishOptions.find((option) => option.value === dishField.value) ?? null}
                    onChange={(_, value) => dishField.onChange(value?.value ?? '')}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    renderInput={(params) => <TextField {...params} label="Plato" required />}
                  />
                )}
              />
              <Controller
                control={control}
                name={`lines.${index}.quantity`}
                rules={{ required: true, min: 1 }}
                render={({ field }) => (
                  <TextField
                    label="Cantidad"
                    type="number"
                    value={field.value}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      const normalizedValue = rawValue.replace(/^0+(?=\d)/, '');
                      event.target.value = normalizedValue;
                      field.onChange(normalizedValue === '' ? 0 : Number(normalizedValue));
                    }}
                    required
                  />
                )}
              />
              <Button onClick={() => remove(index)} color="error">
                Eliminar
              </Button>
            </Stack>
          ))}
          <Button onClick={() => append({ dish: '', quantity: 1 })}>Agregar plato</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Registrar venta
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ManualSaleForm;

